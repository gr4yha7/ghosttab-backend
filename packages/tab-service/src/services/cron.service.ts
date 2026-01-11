import cron, { ScheduledTask } from 'node-cron';
import Decimal from 'decimal.js';
import {
  supabase,
  logger,
  NotFoundError,
  publishNotification,
} from '@ghosttab/common';
import { emailService } from './email.service';

export class CronService {
  private reminderJob: ScheduledTask | null = null;

  /**
   * Initialize cron jobs
   */
  init(): void {
    // Run daily at 9:00 AM
    this.reminderJob = cron.schedule('0 9 * * *', async () => {
      logger.info('Starting scheduled payment reminder job');
      try {
        await this.sendPaymentReminders();
        await this.handleOverdueTabs();
        logger.info('Payment reminder job completed successfully');
      } catch (error) {
        logger.error('Payment reminder job failed', { error });
      }
    });

    logger.info('Cron jobs initialized');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (this.reminderJob) {
      this.reminderJob.stop();
      logger.info('Cron jobs stopped');
    }
  }

  /**
   * Send payment reminders for upcoming deadlines
   */
  async sendPaymentReminders(): Promise<void> {
    logger.info('Sending payment reminders');

    // 3 days before deadline
    await this.sendRemindersForDeadline(3, 'upcoming');

    // 1 day before deadline
    await this.sendRemindersForDeadline(1, 'urgent');

    // Day of deadline
    await this.sendRemindersForDeadline(0, 'final');
  }

  /**
   * Send reminders for specific deadline offset
   */
  private async sendRemindersForDeadline(
    daysUntilDeadline: number,
    urgency: 'upcoming' | 'urgent' | 'final'
  ): Promise<void> {
    const tabs = await this.getTabsNeedingReminders(daysUntilDeadline);

    logger.info(`Found ${tabs.length} tabs needing ${urgency} reminders`, {
      daysUntilDeadline
    });

    for (const tab of tabs) {
      const unpaidParticipants = tab.participants.filter((p: any) => !p.paid);

      for (const participant of unpaidParticipants) {
        try {
          await this.sendReminderToParticipant(
            tab,
            participant,
            daysUntilDeadline,
            urgency
          );

          // Update reminder tracking
          await supabase
            .from('tab_participants')
            .update({
              last_reminder_sent_at: new Date().toISOString(),
              reminder_count: (participant.reminder_count || 0) + 1
            })
            .eq('id', participant.id);

          logger.info('Reminder sent', {
            tabId: tab.id,
            participantId: participant.user_id,
            daysUntilDeadline,
            urgency
          });
        } catch (error) {
          logger.error('Failed to send reminder', {
            tabId: tab.id,
            participantId: participant.user_id,
            error
          });
        }
      }
    }
  }

  /**
   * Get tabs needing reminders for specific deadline offset
   */
  private async getTabsNeedingReminders(daysUntilDeadline: number): Promise<any[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysUntilDeadline);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: tabs, error } = await supabase
      .from('tabs')
      .select(`
        *,
        creator:creator_id (id, username, email),
        participants:tab_participants (
          id,
          user_id,
          share_amount,
          paid,
          reminder_count,
          last_reminder_sent_at,
          user:user_id (id, username, email)
        )
      `)
      .eq('status', 'OPEN')
      .gte('settlement_deadline', targetDate.toISOString())
      .lt('settlement_deadline', nextDay.toISOString())
      .not('settlement_deadline', 'is', null);

    if (error) {
      logger.error('Failed to fetch tabs needing reminders', { error });
      return [];
    }

    // Filter out participants who received reminder in last 23 hours
    return (tabs || []).map(tab => ({
      ...tab,
      participants: tab.participants.filter((p: any) => {
        if (p.paid) return false;

        if (!p.last_reminder_sent_at) return true;

        const lastReminder = new Date(p.last_reminder_sent_at);
        const hoursSinceLastReminder =
          (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60);

        return hoursSinceLastReminder >= 23;
      })
    })).filter(tab => tab.participants.length > 0);
  }

  /**
   * Send reminder to individual participant
   */
  private async sendReminderToParticipant(
    tab: any,
    participant: any,
    daysRemaining: number,
    urgency: 'upcoming' | 'urgent' | 'final'
  ): Promise<void> {
    const urgencyText = {
      upcoming: 'Reminder',
      urgent: 'Urgent Reminder',
      final: 'Final Reminder'
    }[urgency];

    const timeText = daysRemaining === 0
      ? 'today'
      : `in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

    // Send email
    await emailService.sendPaymentReminder({
      to: participant.user.email,
      tabTitle: tab.title,
      amount: participant.share_amount,
      currency: tab.currency,
      deadline: tab.settlement_deadline,
      daysRemaining,
      penaltyRate: tab.penalty_rate,
      creatorName: tab.creator.username || tab.creator.email,
      urgency
    });

    // Send push notification
    await publishNotification(participant.user_id, {
      type: 'PAYMENT_REMINDER',
      title: `${urgencyText}: ${tab.title}`,
      body: `Payment of ${participant.share_amount} ${tab.currency} is due ${timeText}`,
      data: {
        tabId: tab.id,
        deadline: tab.settlement_deadline,
        amount: participant.share_amount,
        penaltyRate: tab.penalty_rate,
        daysRemaining
      },
      userId: participant.user_id
    });

    await supabase.from('notifications').insert({
      user_id: participant.user_id,
      type: 'PAYMENT_REMINDER',
      title: `${urgencyText}: ${tab.title}`,
      body: `Payment due ${timeText}`,
      data: {
        tabId: tab.id,
        deadline: tab.settlement_deadline,
        amount: participant.share_amount
      }
    });
  }

  /**
   * Handle overdue tabs
   */
  async handleOverdueTabs(): Promise<void> {
    logger.info('Checking for overdue tabs');

    const { data: overdueTabs, error } = await supabase
      .from('tabs')
      .select(`
        *,
        creator:creator_id (id, username, email),
        participants:tab_participants (
          id,
          user_id,
          share_amount,
          paid,
          reminder_count,
          last_reminder_sent_at,
          user:user_id (id, username, email)
        )
      `)
      .eq('status', 'OPEN')
      .lt('settlement_deadline', new Date().toISOString())
      .not('settlement_deadline', 'is', null);

    if (error) {
      logger.error('Failed to fetch overdue tabs', { error });
      return;
    }

    logger.info(`Found ${overdueTabs?.length || 0} overdue tabs`);

    for (const tab of overdueTabs || []) {
      const unpaidParticipants = tab.participants.filter((p: any) => !p.paid);

      if (unpaidParticipants.length === 0) continue;

      // Send overdue notifications
      for (const participant of unpaidParticipants) {
        // Only send daily (check last reminder)
        const lastReminder = participant.last_reminder_sent_at
          ? new Date(participant.last_reminder_sent_at)
          : null;

        const shouldSend = !lastReminder ||
          (Date.now() - lastReminder.getTime()) > 23 * 60 * 60 * 1000;

        if (shouldSend) {
          try {
            await this.sendOverdueNotification(tab, participant);
          } catch (error) {
            logger.error('Failed to send overdue notification', {
              tabId: tab.id,
              participantId: participant.user_id,
              error
            });
          }
        }
      }

      // Notify creator about overdue tab (once per day)
      await this.notifyCreatorAboutOverdue(tab, unpaidParticipants);
    }
  }

  /**
   * Send overdue notification to participant
   */
  private async sendOverdueNotification(
    tab: any,
    participant: any
  ): Promise<void> {
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(tab.settlement_deadline).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const penaltyAmount = new Decimal(participant.share_amount)
      .times(tab.penalty_rate || 0)
      .dividedBy(100);

    const totalDue = new Decimal(participant.share_amount)
      .plus(penaltyAmount);

    // Send email
    await emailService.sendOverdueNotification({
      to: participant.user.email,
      tabTitle: tab.title,
      amount: participant.share_amount,
      penaltyAmount: penaltyAmount.toNumber(),
      totalDue: totalDue.toNumber(),
      currency: tab.currency,
      daysOverdue,
      penaltyRate: tab.penalty_rate
    });

    // Send push notification
    await publishNotification(participant.user_id, {
      type: 'PAYMENT_REMINDER',
      title: 'Payment Overdue',
      body: `${tab.title} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Penalty: ${penaltyAmount.toFixed(2)} ${tab.currency}`,
      data: {
        tabId: tab.id,
        daysOverdue,
        penaltyAmount: penaltyAmount.toNumber(),
        totalDue: totalDue.toNumber()
      },
      userId: participant.user_id
    });

    await supabase.from('notifications').insert({
      user_id: participant.user_id,
      type: 'PAYMENT_REMINDER',
      title: 'Payment Overdue',
      body: `${tab.title} - ${daysOverdue} days overdue`,
      data: {
        tabId: tab.id,
        daysOverdue,
        penaltyAmount: penaltyAmount.toNumber(),
        totalDue: totalDue.toNumber()
      }
    });

    // Update tracking
    await supabase
      .from('tab_participants')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (participant.reminder_count || 0) + 1
      })
      .eq('id', participant.id);

    logger.info('Overdue notification sent', {
      tabId: tab.id,
      participantId: participant.user_id,
      daysOverdue
    });
  }

  /**
   * Notify creator about overdue tab
   */
  private async notifyCreatorAboutOverdue(
    tab: any,
    unpaidParticipants: any[]
  ): Promise<void> {
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(tab.settlement_deadline).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const unpaidCount = unpaidParticipants.length;
    const unpaidNames = unpaidParticipants
      .map((p: any) => p.user.username || p.user.email)
      .join(', ');

    await publishNotification(tab.creator_id, {
      type: 'TAB_UPDATED',
      title: `Tab Overdue: ${tab.title}`,
      body: `${unpaidCount} participant${unpaidCount > 1 ? 's' : ''} ${unpaidCount > 1 ? 'have' : 'has'} not paid (${daysOverdue} days overdue)`,
      data: {
        tabId: tab.id,
        daysOverdue,
        unpaidCount,
        unpaidParticipants: unpaidParticipants.map((p: any) => p.user_id)
      },
      userId: tab.creator_id
    });

    logger.info('Creator notified about overdue tab', {
      tabId: tab.id,
      creatorId: tab.creator_id,
      unpaidCount,
      daysOverdue
    });
  }

  /**
   * Manual trigger for testing
   */
  async triggerReminders(): Promise<void> {
    await this.sendPaymentReminders();
    await this.handleOverdueTabs();
  }
}

export const cronService = new CronService();