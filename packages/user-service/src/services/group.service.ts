import {
  supabase,
  logger,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  publishNotification,
  GroupRole,
} from '@ghosttab/common';
import { streamService } from './stream.service';

export interface CreateGroupData {
  name: string; 
  description?: string;
  icon?: string;
  initialMembers?: string[]; // User IDs (must be friends)
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  icon?: string;
}

export class GroupService {
  async createGroup(
    creatorId: string,
    data: CreateGroupData
  ): Promise<any> {
    const { name, description, icon, initialMembers = [] } = data;
    
    // Validate name
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Group name is required');
    }
    
    // Verify all initial members are friends with creator
    if (initialMembers.length > 0) {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', creatorId)
        .eq('status', 'ACCEPTED')
        .in('friend_id', initialMembers);
      
      const friendIds = new Set(friendships?.map(f => f.friend_id) || []);
      const nonFriends = initialMembers.filter(id => !friendIds.has(id));
      
      if (nonFriends.length > 0) {
        throw new ValidationError('All members must be friends with creator');
      }
    }
    
    // Create group
    const { data: group, error: groupError } = await supabase
      .from('user_groups')
      .insert({
        name: name.trim(),
        description: description?.trim(),
        icon,
        creator_id: creatorId,
      })
      .select()
      .single();
    
    if (groupError || !group) {
      logger.error('Failed to create group', { error: groupError });
      throw new Error('Failed to create group');
    }
    
    // Add creator as CREATOR role
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: creatorId,
      role: 'CREATOR',
    });
    
    // Add initial members
    if (initialMembers.length > 0) {
      await supabase.from('group_members').insert(
        initialMembers.map(userId => ({
          group_id: group.id,
          user_id: userId,
          role: 'MEMBER' as GroupRole,
        }))
      );
    }
    
    // Create GetStream group channel
    try {
      const channelId = await streamService.createGroupChannel(
        group.id,
        name,
        creatorId,
        initialMembers
      );
      
      await supabase
        .from('user_groups')
        .update({ stream_channel_id: channelId })
        .eq('id', group.id);
    } catch (error) {
      logger.error('Failed to create group channel', { groupId: group.id, error });
    }
    
    // Get creator info
    const { data: creator } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', creatorId)
      .single();
    
    // Notify initial members
    for (const memberId of initialMembers) {
      await publishNotification(memberId, {
        type: 'GROUP_CREATED',
        title: 'Added to Group',
        body: `${creator?.username || creator?.email} added you to "${name}"`,
        data: { groupId: group.id, creatorId },
        userId: memberId,
      });
      
      await supabase.from('notifications').insert({
        user_id: memberId,
        type: 'GROUP_CREATED',
        title: 'Added to Group',
        body: `${creator?.username || creator?.email} added you to "${name}"`,
        data: { groupId: group.id },
      });
    }
    
    logger.info('Group created', {
      groupId: group.id,
      creatorId,
      memberCount: initialMembers.length + 1,
    });
    
    return this.getGroupById(creatorId, group.id);
  }
  
  async getGroupById(userId: string, groupId: string): Promise<any> {
    // Get group with members
    const { data: group, error: groupError } = await supabase
      .from('user_groups')
      .select(`
        *,
        creator:creator_id (id, username, email, avatar_url, trust_score),
        members:group_members (
          id,
          role,
          joined_at,
          user:user_id (
            id,
            username,
            email,
            avatar_url,
            wallet_address,
            trust_score
          )
        )
      `)
      .eq('id', groupId)
      .single();
    
    if (groupError || !group) {
      throw new NotFoundError('Group');
    }
    
    // Check if user is a member
    const isMember = (group.members as any[]).some(
      (m: any) => m.user.id === userId
    );
    
    if (!isMember) {
      throw new ForbiddenError('You are not a member of this group');
    }
    
    const members = (group.members as any[]).map((m: any) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joined_at,
      user: {
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
        avatarUrl: m.user.avatar_url,
        walletAddress: m.user.wallet_address,
        trustScore: m.user.trust_score,
      },
    }));
    
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      icon: group.icon,
      streamChannelId: group.stream_channel_id,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      creator: {
        id: (group.creator as any).id,
        username: (group.creator as any).username,
        email: (group.creator as any).email,
        avatarUrl: (group.creator as any).avatar_url,
        trustScore: (group.creator as any).trust_score,
      },
      members,
      memberCount: members.length,
    };
  }
  
  async getUserGroups(
    userId: string,
    filters: {
      search?: string; // Search by title
      page?: number;
      limit?: number;
    }
  ): Promise<{ groups: any[]; total: number; page: number; limit: number }> {
    const { search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('group_members')
      .select(`
        role,
        joined_at,
        group:group_id (
          id,
          name,
          description,
          icon,
          created_at,
          creator:creator_id (id, username, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (search) {
      query = query.ilike('group.name', `%${search}%`);
    }

    const { data: memberships, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Failed to fetch user groups', { userId, error });
      throw new Error('Failed to fetch user groups');
    }
    
    const groups = (memberships || []).map((m: any) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      icon: m.group.icon,
      createdAt: m.group.created_at,
      role: m.role,
      joinedAt: m.joined_at,
      creator: {
        id: m.group.creator.id,
        username: m.group.creator.username,
        avatarUrl: m.group.creator.avatar_url,
      },
    }));

    return {
      groups,
      total: count || groups.length,
      page,
      limit,
    }
  }
  
  async updateGroup(
    userId: string,
    groupId: string,
    updates: UpdateGroupData
  ): Promise<any> {
    // Check if user is admin or creator
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!member || !['CREATOR', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenError('Only admins can update the group');
    }
    
    // Update group
    const { error } = await supabase
      .from('user_groups')
      .update({
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.description !== undefined && { 
          description: updates.description?.trim() 
        }),
        ...(updates.icon !== undefined && { icon: updates.icon }),
      })
      .eq('id', groupId);
    
    if (error) {
      throw new Error('Failed to update group');
    }
    
    return this.getGroupById(userId, groupId);
  }
  
  async addMembers(
    userId: string,
    groupId: string,
    memberIds: string[]
  ): Promise<void> {
    // Verify user is admin/creator
    const { data: member } = await supabase
      .from('group_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!member || !['CREATOR', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenError('Only admins can add members');
    }
    
    // Verify all new members are friends with the requester
    const { data: friendships } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'ACCEPTED')
      .in('friend_id', memberIds);
    
    const friendIds = new Set(friendships?.map(f => f.friend_id) || []);
    const nonFriends = memberIds.filter(id => !friendIds.has(id));
    
    if (nonFriends.length > 0) {
      throw new ValidationError('All members must be friends with you');
    }
    
    // Check for existing members
    const { data: existing } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .in('user_id', memberIds);
    
    const existingIds = new Set(existing?.map(m => m.user_id) || []);
    const newMemberIds = memberIds.filter(id => !existingIds.has(id));
    
    if (newMemberIds.length === 0) {
      throw new ValidationError('All users are already members');
    }
    
    // Add new members
    await supabase.from('group_members').insert(
      newMemberIds.map(id => ({
        group_id: groupId,
        user_id: id,
        role: 'MEMBER' as GroupRole,
      }))
    );
    
    // Add to Stream channel
    const { data: group } = await supabase
      .from('user_groups')
      .select('stream_channel_id, name')
      .eq('id', groupId)
      .single();
    
    if (group?.stream_channel_id) {
      await streamService.addMembersToChannel(
        group.stream_channel_id,
        newMemberIds
      );
    }
    
    // Get adder info
    const { data: adder } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', userId)
      .single();
    
    // Notify new members
    for (const memberId of newMemberIds) {
      await publishNotification(memberId, {
        type: 'GROUP_MEMBER_ADDED',
        title: 'Added to Group',
        body: `${adder?.username || adder?.email} added you to "${group?.name}"`,
        data: { groupId, adderId: userId },
        userId: memberId,
      });
      
      await supabase.from('notifications').insert({
        user_id: memberId,
        type: 'GROUP_MEMBER_ADDED',
        title: 'Added to Group',
        body: `${adder?.username || adder?.email} added you to "${group?.name}"`,
        data: { groupId },
      });
    }
    
    logger.info('Members added to group', {
      groupId,
      addedBy: userId,
      newMembers: newMemberIds,
    });
  }
  
  async removeMember(
    userId: string,
    groupId: string,
    memberIdToRemove: string
  ): Promise<void> {
    // Get requester's role
    const { data: requester } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!requester || !['CREATOR', 'ADMIN'].includes(requester.role)) {
      throw new ForbiddenError('Only admins can remove members');
    }
    
    // Get target member's role
    const { data: target } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', memberIdToRemove)
      .single();
    
    if (!target) {
      throw new NotFoundError('Member not found in group');
    }
    
    // CRITICAL: Cannot remove the creator
    if (target.role === 'CREATOR') {
      throw new ForbiddenError('Cannot remove the group creator');
    }
    
    // Admins cannot remove other admins (only creator can)
    if (requester.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenError('Admins cannot remove other admins');
    }
    
    // Remove member
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberIdToRemove);
    
    // Remove from Stream channel
    const { data: group } = await supabase
      .from('user_groups')
      .select('stream_channel_id, name')
      .eq('id', groupId)
      .single();
    
    if (group?.stream_channel_id) {
      await streamService.removeMembersFromChannel(
        group.stream_channel_id,
        [memberIdToRemove]
      );
    }
    
    // Notify removed member
    await publishNotification(memberIdToRemove, {
      type: 'GROUP_MEMBER_REMOVED',
      title: 'Removed from Group',
      body: `You were removed from "${group?.name}"`,
      data: { groupId, removedBy: userId },
      userId: memberIdToRemove,
    });
    
    logger.info('Member removed from group', {
      groupId,
      removedBy: userId,
      removedMember: memberIdToRemove,
    });
  }
  
  async makeAdmin(
    userId: string,
    groupId: string,
    memberIdToPromote: string
  ): Promise<void> {
    // Verify user is the creator
    const { data: requester } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!requester || requester.role !== 'CREATOR') {
      throw new ForbiddenError('Only the creator can make members admins');
    }
    
    // Update member role
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'ADMIN' })
      .eq('group_id', groupId)
      .eq('user_id', memberIdToPromote)
      .eq('role', 'MEMBER'); // Can only promote members
    
    if (error) {
      throw new Error('Failed to update member role');
    }
    
    // Get group info
    const { data: group } = await supabase
      .from('user_groups')
      .select('name')
      .eq('id', groupId)
      .single();
    
    // Notify promoted member
    await publishNotification(memberIdToPromote, {
      type: 'GROUP_ROLE_UPDATED',
      title: 'You\'re now an Admin',
      body: `You're now an admin in "${group?.name}"`,
      data: { groupId, role: 'ADMIN' },
      userId: memberIdToPromote,
    });
    
    logger.info('Member promoted to admin', {
      groupId,
      promotedBy: userId,
      promotedMember: memberIdToPromote,
    });
  }
  
  async removeAdmin(
    userId: string,
    groupId: string,
    adminIdToDemote: string
  ): Promise<void> {
    // Verify user is the creator
    const { data: requester } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!requester || requester.role !== 'CREATOR') {
      throw new ForbiddenError('Only the creator can remove admins');
    }
    
    // Demote admin to member
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'MEMBER' })
      .eq('group_id', groupId)
      .eq('user_id', adminIdToDemote)
      .eq('role', 'ADMIN');
    
    if (error) {
      throw new Error('Failed to update member role');
    }
    
    // Get group info
    const { data: group } = await supabase
      .from('user_groups')
      .select('name')
      .eq('id', groupId)
      .single();
    
    // Notify demoted admin
    await publishNotification(adminIdToDemote, {
      type: 'GROUP_ROLE_UPDATED',
      title: 'Role Changed',
      body: `You're now a member in "${group?.name}"`,
      data: { groupId, role: 'MEMBER' },
      userId: adminIdToDemote,
    });
    
    logger.info('Admin demoted to member', {
      groupId,
      demotedBy: userId,
      demotedAdmin: adminIdToDemote,
    });
  }
  
  async getGroupTabs(
    userId: string,
    groupId: string,
    filters: {
      status?: 'OPEN' | 'SETTLED' | 'CANCELLED';
      page?: number;
      limit?: number;
    }
  ): Promise<any> {
    // Verify user is a member
    const { data: member } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!member) {
      throw new ForbiddenError('You are not a member of this group');
    }
    
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('tabs')
      .select(`
        *,
        creator:creator_id (id, username, avatar_url),
        participants:tab_participants (count)
      `, { count: 'exact' })
      .eq('group_id', groupId);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: tabs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      logger.error('Failed to fetch group tabs', { groupId, error });
      throw new Error('Failed to fetch group tabs');
    }
    
    return {
      tabs: tabs || [],
      total: count || 0,
      page,
      limit,
    };
  }
  
  async leaveGroup(userId: string, groupId: string): Promise<void> {
    // Get user's role
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!member) {
      throw new NotFoundError('You are not a member of this group');
    }
    
    // Creator cannot leave
    if (member.role === 'CREATOR') {
      throw new ForbiddenError('Creator cannot leave the group. Delete it instead.');
    }
    
    // Remove from group
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    
    // Remove from Stream channel
    const { data: group } = await supabase
      .from('user_groups')
      .select('stream_channel_id')
      .eq('id', groupId)
      .single();
    
    if (group?.stream_channel_id) {
      await streamService.removeMembersFromChannel(
        group.stream_channel_id,
        [userId]
      );
    }
    
    logger.info('User left group', { groupId, userId });
  }
  
  async deleteGroup(userId: string, groupId: string): Promise<void> {
    // Verify user is creator
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (!member || member.role !== 'CREATOR') {
      throw new ForbiddenError('Only the creator can delete the group');
    }
    
    // Check for open tabs
    const { data: openTabs } = await supabase
      .from('tabs')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'OPEN');
    
    if (openTabs && openTabs.length > 0) {
      throw new ValidationError('Cannot delete group with open tabs');
    }
    
    // Delete Stream channel
    const { data: group } = await supabase
      .from('user_groups')
      .select('stream_channel_id')
      .eq('id', groupId)
      .single();
    
    if (group?.stream_channel_id) {
      await streamService.deleteChannel(group.stream_channel_id);
    }
    
    // Delete group (cascade deletes members)
    await supabase
      .from('user_groups')
      .delete()
      .eq('id', groupId);
    
    logger.info('Group deleted', { groupId, deletedBy: userId });
  }
}

export const groupService = new GroupService();