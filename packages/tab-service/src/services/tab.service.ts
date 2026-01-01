import Decimal from 'decimal.js';
import {
  supabase,
  logger,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  publishNotification,
} from '@ghosttab/common';
import { streamService } from './stream.service';
import { blockchainService } from './blockchain.service';

interface CreateTabData {
  title: string;
  description?: string;
  icon?: string;
  totalAmount: number;
  currency?: string;
  participants: Array<{
    userId: string;
    shareAmount?: number; // If null, split equally
  }>;
}

interface SettlePaymentData {
  txHash: string;
  amount: number;
}

export class TabService {
  async createTab(creatorId: string, data: CreateTabData): Promise<any> {
    const { title, description, icon, totalAmount, currency = 'MOVE', participants } = data;
    // Validate participants
    if (participants.length === 0) {
      throw new ValidationError('At least one participant is required');
    }

    // Check all participants are friends with creator
    const participantIds = participants.map((p) => p.userId);
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', creatorId)
      .eq('status', 'ACCEPTED')
      .in('friend_id', participantIds);

    if (friendError || !friendships) {
      throw new Error('Failed to verify friendships');
    }

    const friendIds = new Set(friendships.map((f) => f.friend_id));
    const nonFriends = participantIds.filter((id) => !friendIds.has(id));

    if (nonFriends.length > 0) {
      throw new ValidationError('All participants must be friends');
    }

    // Calculate shares
    const total = new Decimal(totalAmount);
    let calculatedShares: Array<{ userId: string; shareAmount: number }>;

    const hasCustomShares = participants.some((p) => p.shareAmount);

    if (hasCustomShares) {
      // Use custom shares
      const shareSum = participants.reduce(
        (sum, p) => sum.plus(new Decimal(p.shareAmount || 0)),
        new Decimal(0)
      );

      if (!shareSum.equals(total)) {
        throw new ValidationError('Share amounts must equal total amount');
      }

      calculatedShares = participants.map((p) => ({
        userId: p.userId,
        shareAmount: p.shareAmount!,
      }));
    } else {
      // Split equally (including creator)
      const allParticipants = [creatorId, ...participantIds];
      const shareAmount = total.dividedBy(allParticipants.length).toNumber();

      calculatedShares = allParticipants.map((userId) => ({
        userId,
        shareAmount,
      }));
    }

    // Create tab
    const { data: tab, error: tabError } = await supabase
      .from('tabs')
      .insert({
        creator_id: creatorId,
        title,
        description,
        icon,
        total_amount: totalAmount,
        currency,
        status: 'OPEN',
      })
      .select()
      .single();

    if (tabError || !tab) {
      logger.error('Failed to create tab', { error: tabError });
      throw new Error('Failed to create tab');
    }

    // Create tab participants
    const { error: participantsError } = await supabase
      .from('tab_participants')
      .insert(
        calculatedShares.map((share) => ({
          tab_id: tab.id,
          user_id: share.userId,
          share_amount: share.shareAmount,
          paid: false,
        }))
      );

    if (participantsError) {
      logger.error('Failed to create participants', { error: participantsError });
      // Rollback tab creation
      await supabase.from('tabs').delete().eq('id', tab.id);
      throw new Error('Failed to create tab participants');
    }

    // Create GetStream channel
    try {
      const channelId = await streamService.createTabChannel(
        tab.id,
        title,
        creatorId,
        participantIds
      );

      // Update tab with channel ID
      await supabase
        .from('tabs')
        .update({ stream_channel_id: channelId })
        .eq('id', tab.id);

      // Send welcome message
      await streamService.sendSystemMessage(
        channelId,
        `${title} tab created! Total: ${currency} ${totalAmount}`,
        { tabId: tab.id, totalAmount, currency }
      );
    } catch (error) {
      logger.error('Failed to create chat channel', { tabId: tab.id, error });
      // Don't fail tab creation if chat fails
    }

    // Get creator info
    const { data: creator } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', creatorId)
      .single();

    // Notify all participants
    for (const participantId of participantIds) {
      const share = calculatedShares.find((s) => s.userId === participantId);

      await publishNotification(participantId, {
        type: 'TAB_CREATED',
        title: 'New Tab Created',
        body: `${creator?.username || creator?.email} created "${title}" - You owe ${currency} ${share?.shareAmount}`,
        data: {
          tabId: tab.id,
          creatorId,
          shareAmount: share?.shareAmount,
        },
        userId: participantId,
      });

      await supabase.from('notifications').insert({
        user_id: participantId,
        type: 'TAB_CREATED',
        title: 'New Tab Created',
        body: `${creator?.username || creator?.email} created "${title}"`,
        data: {
          tabId: tab.id,
          creatorId,
          shareAmount: share?.shareAmount,
        },
      });
    }

    logger.info('Tab created', { tabId: tab.id, creatorId, participants: calculatedShares.length });

    return this.getTabById(creatorId, tab.id);
  }

  async getTabById(userId: string, tabId: string): Promise<any> {
    // Get tab with participants
    const { data: tab, error: tabError } = await supabase
      .from('tabs')
      .select(`
        *,
        creator:creator_id (id, username, email, avatar_url, wallet_address),
        participants:tab_participants (
          id,
          share_amount,
          paid,
          paid_amount,
          paid_tx_hash,
          paid_at,
          user:user_id (id, username, email, avatar_url, wallet_address)
        )
      `)
      .eq('id', tabId)
      .single();

    if (tabError || !tab) {
      throw new NotFoundError('Tab');
    }

    // Check if user is a participant
    const isParticipant = (tab.participants as any[]).some(
      (p: any) => p.user.id === userId
    );

    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant in this tab');
    }

    // Calculate totals
    const participants = (tab.participants as any[]).map((p: any) => ({
      id: p.id,
      user: {
        id: p.user.id,
        username: p.user.username,
        email: p.user.email,
        avatarUrl: p.user.avatar_url,
        walletAddress: p.user.wallet_address,
      },
      shareAmount: p.share_amount,
      paid: p.paid,
      paidAmount: p.paid_amount,
      paidTxHash: p.paid_tx_hash,
      paidAt: p.paid_at,
    }));

    const totalPaid = participants.reduce(
      (sum, p) => sum.plus(new Decimal(p.paidAmount || 0)),
      new Decimal(0)
    );

    const allSettled = participants.every((p) => p.paid);

    return {
      id: tab.id,
      title: tab.title,
      description: tab.description,
      icon: tab.icon,
      totalAmount: tab.total_amount,
      currency: tab.currency,
      status: tab.status,
      streamChannelId: tab.stream_channel_id,
      createdAt: tab.created_at,
      updatedAt: tab.updated_at,
      creator: {
        id: (tab.creator as any).id,
        username: (tab.creator as any).username,
        email: (tab.creator as any).email,
        avatarUrl: (tab.creator as any).avatar_url,
        walletAddress: (tab.creator as any).wallet_address,
      },
      participants,
      summary: {
        totalPaid: totalPaid.toFixed(8),
        remaining: new Decimal(tab.total_amount).minus(totalPaid).toFixed(8),
        allSettled,
      },
    };
  }

  async getUserTabs(
    userId: string,
    filters: {
      status?: 'OPEN' | 'SETTLED' | 'CANCELLED';
      page?: number;
      limit?: number;
    }
  ): Promise<{ tabs: any[]; total: number; page: number; limit: number }> {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Get tabs where user is a participant
    let query = supabase
      .from('tab_participants')
      .select(`
        tab:tab_id (
          id,
          title,
          description,
          icon,
          total_amount,
          currency,
          status,
          created_at,
          creator:creator_id (id, username, email, avatar_url)
        ),
        share_amount,
        paid
      `)
      .eq('user_id', userId);

    if (status) {
      // We need to filter by tab status - this is a bit tricky with the current query
      // For now, we'll fetch all and filter in memory
      // In production, consider a database view or function
    }

    const { data: tabParticipants, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch user tabs', { userId, error });
      throw new Error('Failed to fetch tabs');
    }

    const tabs = (tabParticipants || [])
      .filter((tp: any) => tp.tab && (!status || tp.tab.status === status))
      .map((tp: any) => ({
        id: tp.tab.id,
        title: tp.tab.title,
        description: tp.tab.description,
        icon: tp.tab.icon,
        totalAmount: tp.tab.total_amount,
        currency: tp.tab.currency,
        status: tp.tab.status,
        createdAt: tp.tab.created_at,
        creator: {
          id: tp.tab.creator.id,
          username: tp.tab.creator.username,
          email: tp.tab.creator.email,
          avatarUrl: tp.tab.creator.avatar_url,
        },
        userShare: tp.share_amount,
        userPaid: tp.paid,
      }));

    return {
      tabs,
      total: count || tabs.length,
      page,
      limit,
    };
  }

  async settlePayment(
    userId: string,
    tabId: string,
    data: SettlePaymentData
  ): Promise<void> {
    const { txHash, amount } = data;

    // Get tab participant
    const { data: participant, error: participantError } = await supabase
      .from('tab_participants')
      .select('*, tab:tab_id(id, title, creator_id, stream_channel_id, currency)')
      .eq('tab_id', tabId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new NotFoundError('Tab participant');
    }

    if (participant.paid) {
      throw new ValidationError('Payment already settled');
    }

    // Verify transaction on blockchain
    try {
      const verification = await blockchainService.verifyTransaction(txHash);

      if (!verification.confirmed) {
        throw new ValidationError('Transaction not confirmed on blockchain');
      }

      // Additional verification: check amount and addresses if needed
      // if (verification.amount !== amount) {
      //   throw new ValidationError('Transaction amount mismatch');
      // }
    } catch (error) {
      logger.error('Transaction verification failed', { txHash, error });
      throw new ValidationError('Failed to verify transaction');
    }

    // Update participant as paid
    const { error: updateError } = await supabase
      .from('tab_participants')
      .update({
        paid: true,
        paid_amount: amount,
        paid_tx_hash: txHash,
        paid_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    if (updateError) {
      logger.error('Failed to update participant', { error: updateError });
      throw new Error('Failed to record payment');
    }

    // Record transaction
    const tab = participant.tab as any;
    await supabase.from('transactions').insert({
      tab_id: tabId,
      from_user_id: userId,
      to_user_id: tab.creator_id,
      amount,
      currency: tab.currency,
      tx_hash: txHash,
      type: 'SETTLEMENT',
      status: 'CONFIRMED',
    });

    // Get payer info
    const { data: payer } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', userId)
      .single();

    // Notify creator
    await publishNotification(tab.creator_id, {
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      body: `${payer?.username || payer?.email} paid ${tab.currency} ${amount} for "${tab.title}"`,
      data: {
        tabId,
        fromUserId: userId,
        amount,
        txHash,
      },
      userId: tab.creator_id,
    });

    await supabase.from('notifications').insert({
      user_id: tab.creator_id,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      body: `${payer?.username || payer?.email} paid ${tab.currency} ${amount}`,
      data: { tabId, fromUserId: userId, amount },
    });

    // Send message to chat
    if (tab.stream_channel_id) {
      await streamService.sendSystemMessage(
        tab.stream_channel_id,
        `${payer?.username || payer?.email} paid ${tab.currency} ${amount}`,
        { userId, amount, txHash }
      );
    }

    // Check if all participants have paid
    const { data: allParticipants } = await supabase
      .from('tab_participants')
      .select('paid')
      .eq('tab_id', tabId);

    const allPaid = allParticipants?.every((p) => p.paid);

    if (allPaid) {
      // Mark tab as settled
      await supabase
        .from('tabs')
        .update({ status: 'SETTLED' })
        .eq('id', tabId);

      // Notify all participants
      const { data: participants } = await supabase
        .from('tab_participants')
        .select('user_id')
        .eq('tab_id', tabId);

      for (const p of participants || []) {
        await publishNotification(p.user_id as string, {
          type: 'TAB_SETTLED',
          title: 'Tab Settled',
          body: `"${tab.title}" has been fully settled!`,
          data: { tabId },
          userId: p.user_id,
        });

        await supabase.from('notifications').insert({
          user_id: p.user_id,
          type: 'TAB_SETTLED',
          title: 'Tab Settled',
          body: `"${tab.title}" has been fully settled!`,
          data: { tabId },
        });
      }

      if (tab.stream_channel_id) {
        await streamService.sendSystemMessage(
          tab.stream_channel_id,
          `🎉 Tab fully settled! All payments received.`
        );
      }
    }

    logger.info('Payment settled', { tabId, userId, amount, txHash });
  }

  async updateTab(
    userId: string,
    tabId: string,
    updates: {
      title?: string;
      description?: string;
      icon?: string;
    }
  ): Promise<any> {
    // Check if user is the creator
    const { data: tab, error } = await supabase
      .from('tabs')
      .select('creator_id, status')
      .eq('id', tabId)
      .single();

    if (error || !tab) {
      throw new NotFoundError('Tab');
    }

    if (tab.creator_id !== userId) {
      throw new ForbiddenError('Only the creator can update this tab');
    }

    if (tab.status !== 'OPEN') {
      throw new ValidationError('Cannot update a settled or cancelled tab');
    }

    // Update tab
    const { error: updateError } = await supabase
      .from('tabs')
      .update(updates)
      .eq('id', tabId);

    if (updateError) {
      throw new Error('Failed to update tab');
    }

    return this.getTabById(userId, tabId);
  }

  async cancelTab(userId: string, tabId: string): Promise<void> {
    // Check if user is the creator
    const { data: tab, error } = await supabase
      .from('tabs')
      .select('creator_id, status, stream_channel_id, title')
      .eq('id', tabId)
      .single();

    if (error || !tab) {
      throw new NotFoundError('Tab');
    }

    if (tab.creator_id !== userId) {
      throw new ForbiddenError('Only the creator can cancel this tab');
    }

    if (tab.status !== 'OPEN') {
      throw new ValidationError('Cannot cancel a settled or already cancelled tab');
    }

    // Cancel tab
    await supabase
      .from('tabs')
      .update({ status: 'CANCELLED' })
      .eq('id', tabId);

    // Notify all participants
    const { data: participants } = await supabase
      .from('tab_participants')
      .select('user_id')
      .eq('tab_id', tabId)
      .neq('user_id', userId);

    for (const p of participants || []) {
      await publishNotification(p.user_id as string, {
        type: 'TAB_UPDATED',
        title: 'Tab Cancelled',
        body: `"${tab.title}" has been cancelled`,
        data: { tabId, status: 'CANCELLED' },
        userId: p.user_id,
      });

      await supabase.from('notifications').insert({
        user_id: p.user_id,
        type: 'TAB_UPDATED',
        title: 'Tab Cancelled',
        body: `"${tab.title}" has been cancelled`,
        data: { tabId },
      });
    }

    // Send message to chat
    if (tab.stream_channel_id) {
      await streamService.sendSystemMessage(
        tab.stream_channel_id,
        `Tab has been cancelled by the creator.`
      );
    }

    logger.info('Tab cancelled', { tabId, userId });
  }
}

export const tabService = new TabService();