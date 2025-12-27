const supabase = require('../config/database');
const { ethers } = require('ethers');

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

class FriendService {
  async getUserFriends(id) {
    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user, responded_at')
    .eq('from_user', id)
    .eq('status', "accepted");

    if (error) throw error;
    
    // If no pending friend requests, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    return data;
  }

  async getPendingRequests(id) {
    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user')
    .eq('from_user', id)
    .eq('status', "pending");

    if (error) throw error;
    
    // If no pending friend requests, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    return data;
  }
  
  async cancelRequestOrRemoveFriend(user_id, request_id) {
    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user')
    .eq('id', request_id)

    if (error) throw error;

    if (!data[0]) {
        throw new Error('Invalid Request');
    }
    if (data[0].to_user !== user_id || data[0].from_user !== user_id) {
        throw new Error('Unauthorized Action');
    }

    // 4. Delete the record
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', request_id);

    if (deleteError) throw deleteError;

    return true;
  }
  
  async acceptRequest(to_user_id, request_id) {
   
    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user')
    .eq('id', request_id)

    if (error) throw error;

    if (!data[0]) {
        throw new Error('Invalid Request');
    }
    if (data[0].to_user !== to_user_id) {
        throw new Error('Unauthorized Action');
    }

    // 4. Update the record
    const { data:updateData, error:updateError } = await supabase
      .from('friend_requests')
      .update([{ status: "accepted", responded_at: new Date().toISOString()}])
      .eq('id', request_id)
      .select('id, from_user, to_user, status, responded_at')
      .single();

    if (updateError) throw updateError;

    return true;
  }

  async sendFriendRequest(id, to_user_id) {
    const privyClient = await getPrivyClient();
    let user;


    try {
     user = await privyClient.users()._get(to_user_id);
    } catch (error) {
        throw new Error(error);
    }

    const { data: isExistData, error:isExistError } = await supabase
    .from('friend_requests')
    .select('to_user')
    .eq('from_user', id)
    .eq('to_user', to_user_id);

    if (isExistError) throw isExistError;

    if (isExistData[0]) {
        throw new Error('Request already exist');
    }

    // 4. Create the record
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ from_user: id, to_user: to_user_id, status: "pending"}])
      .select('from_user, to_user, status')
      .single();

    if (error) throw error;

    return true;
  }
}

module.exports = new FriendService();