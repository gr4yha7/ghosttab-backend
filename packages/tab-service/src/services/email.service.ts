// import { Resend } from 'resend';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { logger } from '@ghosttab/common';
import { config } from '../config';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: config.mailgun.apiKey });
const sender = `GhostTab <postmaster@${config.mailgun.sandboxDomain}>`;

// const resend = new Resend(config.resend.apiKey);

export class EmailService {
  async sendTabParticipationOTP(
    email: string,
    code: string,
    tabTitle: string,
    shareAmount: number,
    currency: string
  ): Promise<void> {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">GhostTab - Tab Invitation</h2>
          <p>You've been added to a new tab: <strong>"${tabTitle}"</strong></p>
          <p>Your share: <strong>${currency} ${shareAmount}</strong></p>
          
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
            ${code}
          </div>
          
          <p style="margin-top: 20px;">Enter this code in the app to accept or decline this tab.</p>
          <p style="color: #6b7280;">This code will expire in 15 minutes.</p>
        </div>
      `;

      // await resend.emails.send({
      //   from: 'GhostTab <noreply@ghosttab.app>',
      //   to: email,
      //   subject: `You've been added to "${tabTitle}"`,
      //   html,
      // });
      await mg.messages.create(config.mailgun.sandboxDomain, {
        from: sender,
        to: [email],
        subject: `You've been added to "${tabTitle}" tab on GhostTab`,
        html,
      });
      logger.info('OTP email sent', { email, type: 'TAB_PARTICIPATION' });
    } catch (error) {
      logger.error('Failed to send OTP email', { email, type: 'TAB_PARTICIPATION', error });
      throw new Error('Failed to send verification email');
    }
  }
  // async sendOTP(email: string, code: string, type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPT'): Promise<void> {
  //   try {
  //     const subject = type === 'FRIEND_REQUEST' 
  //       ? 'GhostTab - Friend Request' 
  //       : 'GhostTab - Accept Friend Request';

  //     const html = `
  //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  //         <h2 style="color: #4f46e5;">GhostTab</h2>
  //         <p>Your verification code is:</p>
  //         <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
  //           ${code}
  //         </div>
  //         <p style="margin-top: 20px; color: #6b7280;">This code will expire in ${config.otp.expiryMinutes} minutes.</p>
  //         <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
  //       </div>
  //     `;

  //     await resend.emails.send({
  //       from: 'GhostTab <noreply@ghosttab.app>',
  //       to: email,
  //       subject,
  //       html,
  //     });

  //     logger.info('OTP email sent', { email, type });
  //   } catch (error) {
  //     logger.error('Failed to send OTP email', { email, type, error });
  //     throw new Error('Failed to send verification email');
  //   }
  // }

  async sendPaymentReminder(params: {
    to: string;
    tabTitle: string;
    amount: number;
    currency: string;
    deadline: string;
    daysRemaining: number;
    penaltyRate: number;
    creatorName: string;
    urgency: 'upcoming' | 'urgent' | 'final';
  }): Promise<void> {
    try {
      const { to, tabTitle, amount, currency, deadline, daysRemaining, penaltyRate, creatorName, urgency } = params;

      const urgencyColor = {
        upcoming: '#3b82f6',
        urgent: '#f59e0b',
        final: '#ef4444'
      }[urgency];

      const urgencyText = {
        upcoming: 'Reminder',
        urgent: 'Urgent Reminder',
        final: 'Final Reminder'
      }[urgency];

      const timeText = daysRemaining === 0
        ? 'today'
        : `in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

      const deadlineDate = new Date(deadline).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: white;">${urgencyText}</h2>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Your payment for <strong>"${tabTitle}"</strong> is due ${timeText}.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Amount Due:</strong> ${currency} ${amount}</p>
              <p style="margin: 5px 0;"><strong>Deadline:</strong> ${deadlineDate}</p>
              <p style="margin: 5px 0;"><strong>Created by:</strong> ${creatorName}</p>
            </div>

            ${penaltyRate > 0 ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Late Payment Penalty:</strong> ${penaltyRate}% per day after deadline</p>
              </div>
            ` : ''}

            <p style="color: #6b7280; margin-top: 20px;">Open the GhostTab app to make your payment.</p>
          </div>
        </div>
      `;

      // await resend.emails.send({
      //   from: 'GhostTab <noreply@ghosttab.app>',
      //   to,
      //   subject: `${urgencyText}: Payment for "${tabTitle}" due ${timeText}`,
      //   html,
      // });
      await mg.messages.create(config.mailgun.sandboxDomain, {
        from: sender,
        to,
        subject: `${urgencyText}: Payment for "${tabTitle}" due ${timeText}`,
        html,
      });

      logger.info('Payment reminder email sent', { to, tabTitle, daysRemaining, urgency });
    } catch (error) {
      logger.error('Failed to send payment reminder email', { error });
      throw new Error('Failed to send payment reminder email');
    }
  }

  async sendOverdueNotification(params: {
    to: string;
    tabTitle: string;
    amount: number;
    penaltyAmount: number;
    totalDue: number;
    currency: string;
    daysOverdue: number;
    penaltyRate: number;
  }): Promise<void> {
    try {
      const { to, tabTitle, amount, penaltyAmount, totalDue, currency, daysOverdue, penaltyRate } = params;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: white;">⚠️ Payment Overdue</h2>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Your payment for <strong>"${tabTitle}"</strong> is now <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Original Amount:</strong> ${currency} ${amount}</p>
              <p style="margin: 5px 0; color: #dc2626;"><strong>Penalty (${penaltyRate}%):</strong> ${currency} ${penaltyAmount.toFixed(2)}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;" />
              <p style="margin: 5px 0; font-size: 18px;"><strong>Total Due:</strong> ${currency} ${totalDue.toFixed(2)}</p>
            </div>

            <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 20px;">
              <p style="margin: 0; color: #991b1b;"><strong>Action Required:</strong> Please settle this payment as soon as possible to avoid additional penalties.</p>
            </div>

            <p style="color: #6b7280; margin-top: 20px;">Open the GhostTab app to make your payment now.</p>
          </div>
        </div>
      `;

      // await resend.emails.send({
      //   from: 'GhostTab <noreply@ghosttab.app>',
      //   to,
      //   subject: `⚠️ Payment Overdue: "${tabTitle}" (${daysOverdue} days)`,
      //   html,
      // });
      await mg.messages.create(config.mailgun.sandboxDomain, {
        from: sender,
        to,
        subject: `⚠️ Payment Overdue: "${tabTitle}" (${daysOverdue} days)`,
        html,
      });

      logger.info('Overdue notification email sent', { to, tabTitle, daysOverdue });
    } catch (error) {
      logger.error('Failed to send overdue notification email', { error });
      throw new Error('Failed to send overdue notification email');
    }
  }
}

export const emailService = new EmailService();