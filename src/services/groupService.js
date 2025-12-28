const supabase = require('../config/database');

let privy = null;

const getPrivyClient = async () => {
  if (!privy) {
    const { PrivyClient } = await import('@privy-io/node');
    privy = new PrivyClient({
      appId: process.env.PRIVY_APP_ID,
      appSecret: process.env.PRIVY_APP_SECRET
    });
  }
  return privy;
};

class GroupService {
  /**
   * Get all groups where the user is a member
   * Returns an array of group details
   */
  async getUserGroups(user_id) {
    // Get all groups where user is a member
    const { data: memberGroups, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('member_id', user_id);

    if (memberError) throw memberError;

    if (!memberGroups || memberGroups.length === 0) {
      return [];
    }

    // Extract group IDs
    const groupIds = memberGroups.map(mg => mg.group_id);

    // Fetch group details
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, description, created_by, created_at, updated_at')
      .in('id', groupIds);

    if (groupsError) throw groupsError;

    return groups || [];
  }

  /**
   * Check if caller is group creator or admin
   */
  async _isCreatorOrAdmin(caller_id, group_id) {
    // Check if caller is the creator
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', group_id)
      .single();

    if (groupError) throw groupError;

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.created_by === caller_id) {
      return true;
    }

    // Check if caller is an admin
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('is_admin')
      .eq('group_id', group_id)
      .eq('member_id', caller_id)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      throw memberError;
    }

    return member && member.is_admin === true;
  }

  /**
   * Remove a member from a group
   * Only group creator or admins can remove members
   */
  async removeGroupMember(caller_id, group_id, member_id) {
    // Verify caller is creator or admin
    const isAuthorized = await this._isCreatorOrAdmin(caller_id, group_id);
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only group creator or admins can remove members');
    }

    // Prevent removing the creator
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', group_id)
      .single();

    if (groupError) throw groupError;

    if (group.created_by === member_id) {
      throw new Error('Cannot remove group creator');
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('member_id', member_id);

    if (deleteError) throw deleteError;

    return true;
  }

  /**
   * Add a member to a group
   * Only group creator or admins can add members
   */
  async addGroupMember(caller_id, group_id, member_id) {
    // Verify caller is creator or admin
    const isAuthorized = await this._isCreatorOrAdmin(caller_id, group_id);
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only group creator or admins can add members');
    }

    // Check if member already exists
    const { data: existingMember, error: checkError } = await supabase
      .from('group_members')
      .select('member_id')
      .eq('group_id', group_id)
      .eq('member_id', member_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    // Verify the user exists (optional - can be removed if not needed)
    const privyClient = await getPrivyClient();
    try {
      await privyClient.users()._get(member_id);
    } catch (error) {
      throw new Error('Invalid user ID');
    }

    // Add the member
    const { data, error: insertError } = await supabase
      .from('group_members')
      .insert([{ group_id, member_id, is_admin: false }])
      .select('group_id, member_id, is_admin')
      .single();

    if (insertError) throw insertError;

    return data;
  }

  /**
   * Add or remove group admin status
   * Only group creator can add/remove admins
   */
  async addOrRemoveGroupAdmin(caller_id, group_id, member_id, is_admin) {
    // Verify caller is the creator
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', group_id)
      .single();

    if (groupError) throw groupError;

    if (!group) {
      throw new Error('Group not found');
    }

    if (group.created_by !== caller_id) {
      throw new Error('Unauthorized: Only group creator can add/remove admins');
    }

    // Prevent changing creator's admin status
    if (group.created_by === member_id) {
      throw new Error('Cannot change admin status of group creator');
    }

    // Check if member exists in group
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('member_id')
      .eq('group_id', group_id)
      .eq('member_id', member_id)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        throw new Error('User is not a member of this group');
      }
      throw memberError;
    }

    // Update admin status
    const { data: updatedMember, error: updateError } = await supabase
      .from('group_members')
      .update({ is_admin })
      .eq('group_id', group_id)
      .eq('member_id', member_id)
      .select('group_id, member_id, is_admin')
      .single();

    if (updateError) throw updateError;

    return updatedMember;
  }

  /**
   * Create a new group
   * Creates the group and adds the creator as a member with admin status
   */
  async createGroup(caller_id, name, description) {
    if (!name || !name.trim()) {
      throw new Error('Group name is required');
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: name.trim(), description: description || null, created_by: caller_id }])
      .select('id, name, description, created_by, created_at')
      .single();

    if (groupError) throw groupError;

    // Add creator as member with admin status
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{ group_id: group.id, member_id: caller_id, is_admin: true }]);

    if (memberError) throw memberError;

    return group;
  }
}

module.exports = new GroupService();
