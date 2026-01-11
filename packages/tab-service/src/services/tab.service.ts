import Decimal from 'decimal.js';
import {
  supabase,
  logger,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  publishNotification,
  TabCategory,
} from '@ghosttab/common';
import { streamService } from './stream.service';
import { blockchainService } from './blockchain.service';
import { otpService } from './otp.service';
import { trustScoreService } from './trustscore.service';
import { config } from '../config';

interface CreateTabData {
  title: string;
  description?: string;
  category?: TabCategory;
  totalAmount: number;
  currency?: string;
  participants: Array<{
    userId: string;
    shareAmount?: number; // If null, split equally
  }>;
  settlementDeadline?: Date; // Optional deadline
  settlementWallet?: string; // Optional settlement wallet
  penaltyRate?: number; // Default 5%
  autoSettle?: boolean; // Auto-settle after deadline
}

interface CreateGroupTabData {
  title: string;
  description?: string;
  category?: TabCategory;
  totalAmount: number;
  currency?: string;
  settlementDeadline?: Date; // Optional deadline
  settlementWallet?: string; // Optional settlement wallet
  penaltyRate?: number; // Default 5%
  autoSettle?: boolean; // Auto-settle after deadline
}

interface SettlePaymentData {
  txHash: string;
  amount: number;
}

export class TabService {
  async createTab(creatorId: string, data: CreateTabData): Promise<any> {
    const { title, description, category, totalAmount, currency = 'MOVE', participants } = data;
    // Validate participants
    if (participants.length === 0) {
      throw new ValidationError('At least one participant is required');
    }

    // Check all participants are friends with creator
    const participantIds = participants
      .map((p) => p.userId)
      .filter((id) => id !== creatorId); // Filter out creator if included
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', creatorId)
      .eq('status', 'ACCEPTED')
      .in('friend_id', participantIds);

    if (friendError || !friendships) {
      throw new Error('Failed to verify friendships');
    }

    const friendIds = new Set(friendships.map((f: { friend_id: string }) => f.friend_id));
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
      calculatedShares = participants.map((p) => ({
        userId: p.userId,
        shareAmount: p.shareAmount!,
      }));

      const shareSum = calculatedShares.reduce(
        (sum, p) => sum.plus(new Decimal(p.shareAmount)),
        new Decimal(0)
      );

      if (!shareSum.equals(total)) {
        throw new ValidationError('Share amounts must equal total amount');
      }
    } else {
      // Split equally among provided participants
      // If creator is not in participants, they are not part of the split
      const allParticipants = participants.map(p => p.userId);
      const shareAmount = total.dividedBy(allParticipants.length).toNumber();

      calculatedShares = allParticipants.map((userId) => ({
        userId,
        shareAmount,
      }));
    }

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('users')
      .select('username, email, wallet_address')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      throw new Error('Failed to get creator info');
    }

    // Create tab
    const { data: tab, error: tabError } = await supabase
      .from('tabs')
      .insert({
        creator_id: creatorId,
        title,
        description,
        category,
        total_amount: totalAmount,
        currency,
        status: 'OPEN',
        settlement_deadline: data.settlementDeadline?.toISOString(),
        settlement_wallet: data.settlementWallet || creator?.wallet_address,
        penalty_rate: data.penaltyRate || 5.0,
        auto_settle_enabled: data.autoSettle || false,
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
          verified: share.userId === creatorId, // Creator is auto-verified
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
      const allMembers = [creatorId, ...participantIds];
      const walletMap = await this.resolveWalletAddresses(allMembers);

      const channelId = await streamService.createTabChannel(
        tab.id,
        title,
        walletMap[creatorId],
        participantIds.map(id => walletMap[id])
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

    // Notify all participants
    for (const participantId of participantIds) {
      const share = calculatedShares.find((s) => s.userId === participantId);
      const { data: participant } = await supabase
        .from('users')
        .select('email, username')
        .eq('id', participantId)
        .single();

      if (!participant?.email) {
        throw new ValidationError(
          `Participant ${participant?.username} has no email`
        );
      }

      // Create OTP for tab participation - SKIP for creator
      if (participantId !== creatorId) {
        await otpService.createAndSendOTP(
          participant.email,
          'TAB_PARTICIPATION',
          {
            tabId: tab.id,
            tabTitle: title,
            shareAmount: share?.shareAmount,
            currency,
            creatorId,
          }
        );
      }

      const notificationBody = `${creator?.username || creator?.email} invited you to join '${title}' tab. Click to accept or decline.`;

      await publishNotification(participantId, {
        type: 'TAB_CREATED',
        title: 'New Tab Created',
        body: notificationBody,
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
        body: notificationBody,
        data: {
          tabId: tab.id,
          creatorId,
          shareAmount: share?.shareAmount,
        },
      });
    }

    // Mark all participants as pending verification
    await supabase
      .from('tab_participants')
      .update({ verified: false })
      .eq('tab_id', tab.id)
      .neq('user_id', creatorId); // Creator doesn't need verification

    logger.info('Tab created, OTPs sent to participants', { tabId: tab.id, creatorId, participants: calculatedShares.length });

    return this.getTabById(creatorId, tab.id);
  }

  async createGroupTab(
    userId: string,
    groupId: string,
    tabData: CreateGroupTabData
  ): Promise<any> {
    // Verify user is admin or creator
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!member || !['CREATOR', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenError('Only admins can create group tabs');
    }

    // Get all group members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const memberIds = members?.map((m: { user_id: string }) => m.user_id) || [];

    // Create tab with group_id
    const tab = await this.createTab(userId, {
      ...tabData,
      participants: memberIds
        .map((id: string) => ({ userId: id })),
    });

    // Link tab to group
    await supabase
      .from('tabs')
      .update({ group_id: groupId })
      .eq('id', tab.id);

    logger.info('Group tab created', { groupId, tabId: tab.id, creatorId: userId });

    return tab;
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
          verified,
          user:user_id (id, username, email, avatar_url, wallet_address)
        )
      `)
      .eq('id', tabId)
      .single();

    if (tabError || !tab) {
      throw new NotFoundError('Tab');
    }

    // Check if user is a participant OR the creator
    const isCreator = tab.creator_id === userId;
    const isParticipant = (tab.participants as any[]).some(
      (p: any) => p.user.id === userId
    );

    if (!isParticipant && !isCreator) {
      throw new ForbiddenError('You are not a participant in this tab');
    }

    // Calculate totals
    const participants = (tab.participants as any[]).map((p: any) => ({
      id: p.id,
      userId: p.user.id,
      user: {
        id: p.user.id,
        username: p.user.username,
        email: p.user.email,
        avatarUrl: p.user.avatar_url,
        walletAddress: p.user.wallet_address,
      },
      shareAmount: p.share_amount,
      paid: p.paid,
      verified: p.verified,
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
      category: tab.category,
      totalAmount: tab.total_amount,
      currency: tab.currency,
      status: tab.status,
      settlementDeadline: tab.settlement_deadline,
      penaltyRate: tab.penalty_rate,
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
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const { status, category, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tab_participants')
      .select(`
        tab:tab_id (
          id,
          title,
          description,
          category,
          total_amount,
          currency,
          status,
          settlement_deadline,
          penalty_rate,
          created_at,
          creator:creator_id (id, username, email, avatar_url)
        ),
        share_amount,
        paid,
        verified
      `, { count: 'exact' })
      .eq('user_id', userId);

    if (category) {
      query = query.eq('tab.category', category);
    }

    if (search) {
      query = query.ilike('tab.title', `%${search}%`);
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
      .map((tp: any) => {
        const tab = tp.tab;
        return {
          id: tab.id,
          title: tab.title,
          description: tab.description,
          category: tab.category,
          totalAmount: tab.total_amount,
          currency: tab.currency,
          status: tab.status,
          settlementDeadline: tab.settlement_deadline,
          penaltyRate: tab.penalty_rate,
          createdAt: tab.created_at,
          creator: {
            id: tab.creator.id,
            username: tab.creator.username,
            email: tab.creator.email,
            avatarUrl: tab.creator.avatar_url,
          },
          userShare: tp.share_amount,
          userPaid: tp.paid,
          userVerified: tp.verified,
        };
      });

    return {
      data: tabs,
      total: count || tabs.length,
      page,
      limit,
    };
  }

  async getCategoryStats(userId: string): Promise<any> {
    const { data } = await supabase
      .from('tab_participants')
      .select(`
        tab:tab_id (category, total_amount, status)
      `)
      .eq('user_id', userId);

    const stats = data && data.reduce((acc: Record<string, { count: number, totalAmount: Decimal }>, item: any) => {
      const category = item.tab?.category as TabCategory;
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalAmount: new Decimal(0),
        };
      }
      acc[category].count++;
      acc[category].totalAmount = acc[category].totalAmount.plus(
        new Decimal(item.tab?.total_amount ?? 0)
      );
      return acc;
    }, {});

    return stats;
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
      .select('*, tab:tab_id(id, title, creator_id, stream_channel_id, currency, settlement_deadline, penalty_rate)')
      .eq('tab_id', tabId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new NotFoundError('Tab participant');
    }

    if (participant.paid) {
      throw new ValidationError('Payment already settled');
    }

    // Calculate if late and penalty
    const now = new Date();
    const deadline = participant.tab?.settlement_deadline ? new Date(participant.tab.settlement_deadline) : null;
    const isLate = deadline ? now > deadline : false;
    const daysLate = isLate && deadline
      ? Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const penaltyAmount = isLate && participant.tab?.penalty_rate as number > 0
      ? new Decimal(participant.share_amount)
        .times(participant.tab?.penalty_rate as number)
        .dividedBy(100)
      : new Decimal(0);

    const finalAmount = new Decimal(participant.share_amount)
      .plus(penaltyAmount);

    // Verify paid amount includes penalty
    if (new Decimal(data.amount).lessThan(finalAmount)) {
      throw new ValidationError(
        `Payment must include penalty. Required: ${finalAmount}, Received: ${data.amount}`
      );
    }

    // Update participant with payment info
    await supabase
      .from('tab_participants')
      .update({
        paid: true,
        paid_amount: data.amount,
        paid_tx_hash: data.txHash,
        paid_at: now.toISOString(),
        settled_early: !isLate,
        days_late: daysLate,
        penalty_amount: penaltyAmount.toNumber(),
        final_amount: finalAmount.toNumber(),
      })
      .eq('id', participant.id);

    // Update trust score and record history
    await trustScoreService.updateTrustScore(
      userId,
      !isLate,
      daysLate,
      tabId,
      penaltyAmount.toNumber()
    );

    // Extract tab data for verification
    const tab = participant.tab as any;

    // Verify transaction on blockchain
    try {
      const verification = await blockchainService.verifyTransaction(txHash);

      if (!verification.confirmed) {
        throw new ValidationError('Transaction not confirmed on blockchain');
      }

      // Verify transaction amount matches expected payment (exact amounts only)
      // Round both to 6 decimal places to handle precision issues with split payments
      const expectedAmount = new Decimal(participant.share_amount).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

      if (!verification.amount) {
        throw new ValidationError('Transaction amount not found in blockchain data');
      }

      // Convert from Octas (1 APT = 100,000,000 Octas)
      const actualAmount = new Decimal(verification.amount).dividedBy(1e6).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

      if (!actualAmount.equals(expectedAmount)) {
        throw new ValidationError(
          `Transaction amount mismatch. Expected: ${expectedAmount.toFixed(6)} ${tab.currency}, Got: ${actualAmount.toFixed(6)} ${tab.currency}`
        );
      }

      // Verify sender wallet address
      const { data: user } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('id', userId)
        .single();

      if (user?.wallet_address && verification.fromAddress) {
        // Normalize addresses for comparison (case-insensitive)
        const normalizedUserAddress = user.wallet_address.toLowerCase();
        const normalizedTxAddress = verification.fromAddress.toLowerCase();

        if (normalizedUserAddress !== normalizedTxAddress) {
          throw new ValidationError(
            `Transaction sender address mismatch. Expected: ${user.wallet_address}, Got: ${verification.fromAddress}`
          );
        }
      }

      // Optionally verify recipient address (creator's wallet)
      // const { data: creator } = await supabase
      //   .from('users')
      //   .select('wallet_address')
      //   .eq('id', tab.creator_id)
      //   .single();

      if (verification.toAddress) {
        const normalizedCreatorAddress = config.movement.ghosttabSettlementAddress.toLowerCase();
        const normalizedTxToAddress = verification.toAddress.toLowerCase();

        if (normalizedCreatorAddress !== normalizedTxToAddress) {
          throw new ValidationError(
            `Transaction recipient address mismatch. Expected: ${config.movement.ghosttabSettlementAddress}, Got: ${verification.toAddress}`
          );
        }
      }

      logger.info('Transaction verified successfully', {
        txHash,
        from: verification.fromAddress,
        to: verification.toAddress,
        amount: actualAmount.toFixed(8),
        blockNumber: verification.blockNumber
      });

    } catch (error: any) {
      logger.error('Transaction verification failed', {
        txHash,
        userId,
        tabId,
        error: error?.message || error
      });

      // Re-throw ValidationError as-is for specific error messages
      if (error instanceof ValidationError) {
        throw error;
      }

      // Wrap other errors
      throw new ValidationError(`Failed to verify transaction: ${error?.message || 'Unknown error'}`);
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

    const allPaid = allParticipants?.every((p: { paid: boolean | null }) => p.paid);

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
      category?: TabCategory;
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
        'Tab has been cancelled by the creator.'
      );
    }

    logger.info('Tab cancelled', { tabId, userId });
  }

  private async resolveWalletAddresses(userIds: string[]): Promise<Record<string, string>> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, wallet_address')
      .in('id', userIds);

    if (error || !users) {
      logger.error('Failed to resolve wallet addresses', { userIds, error });
      throw new Error('Failed to resolve identifiers for chat');
    }

    const walletMap: Record<string, string> = {};
    users.forEach(u => {
      walletMap[u.id] = u.wallet_address;
    });

    // Verify all IDs were resolved
    userIds.forEach(id => {
      if (!walletMap[id]) {
        logger.error('User wallet not found', { userId: id });
        throw new Error(`Profile for user ${id} is incomplete`);
      }
    });

    return walletMap;
  }

  async verifyTabParticipation(
    userId: string,
    tabId: string,
    otpCode: string,
    accept: boolean
  ): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user?.email) {
      throw new ValidationError('Email required for verification');
    }

    // Verify OTP
    const verification = await otpService.verifyOTP(
      user.email,
      otpCode,
      'TAB_PARTICIPATION'
    );

    if (!verification.valid) {
      throw new ValidationError('Invalid or expired OTP');
    }

    // Check metadata matches
    if (verification.metadata.tabId !== tabId) {
      throw new ValidationError('OTP does not match this tab');
    }

    if (accept) {
      // Accept participation
      await supabase
        .from('tab_participants')
        .update({ verified: true })
        .eq('tab_id', tabId)
        .eq('user_id', userId);

      logger.info('Tab participation accepted', { tabId, userId });
    } else {
      // Decline participation - remove from tab
      await supabase
        .from('tab_participants')
        .delete()
        .eq('tab_id', tabId)
        .eq('user_id', userId);

      // Recalculate shares for remaining participants
      await this.recalculateShares(tabId);

      logger.info('Tab participation declined', { tabId, userId });
    }
  }

  // Helper to recalculate shares if someone declines
  async recalculateShares(tabId: string): Promise<void> {
    const { data: tab, error } = await supabase
      .from('tabs')
      .select('total_amount')
      .eq('id', tabId)
      .single();

    if (!tab || error) {
      throw new NotFoundError('Tab');
    }

    const { data: participants, error: tabParticipantsError } = await supabase
      .from('tab_participants')
      .select('id')
      .eq('tab_id', tabId);

    if (!participants || tabParticipantsError) {
      throw new NotFoundError('Tab Participants');
    }

    const newShareAmount = new Decimal(tab.total_amount)
      .dividedBy(participants.length);

    await supabase
      .from('tab_participants')
      .update({ share_amount: newShareAmount.toNumber() })
      .eq('tab_id', tabId);
  }

  async resendOTP(userId: string, tabId: string): Promise<void> {
    // Get tab participant
    const { data: participant, error: participantError } = await supabase
      .from('tab_participants')
      .select('*, tab:tab_id(id, title, currency)')
      .eq('tab_id', tabId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new NotFoundError('Tab participant');
    }

    if (participant.verified) {
      // Logic: Already verified participants don't need a resend.
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user || !user.email) {
      throw new ValidationError('User email not found');
    }

    const tab = participant.tab as any;

    // Create and send OTP
    await otpService.createAndSendOTP(
      user.email,
      'TAB_PARTICIPATION',
      {
        tabId: tab.id,
        tabTitle: tab.title,
        shareAmount: participant.share_amount,
        currency: tab.currency,
        userId: userId,
      }
    );

    // Update sent_at
    await supabase
      .from('tab_participants')
      .update({ otp_sent_at: new Date().toISOString() })
      .eq('id', participant.id);

    logger.info('OTP resent to participant', { userId, tabId });
  }
}

export const tabService = new TabService();