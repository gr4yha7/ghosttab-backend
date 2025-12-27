const supabase = require('../config/database');
const { ethers } = require('ethers');

class FriendService {
  async getUserFriends(wallet_address) {
    const { data: authUser, error: signerErr } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', wallet_address)
      .single();

    if (signerErr) {
      if (signerErr.code === 'PGRST116') {
        throw new Error('Mismatch Payload'); // no matching user
      }
      throw signerErr;
    }

    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user_id')
    .eq('from_user_id', authUser.id)
    .eq('status', "accepted");

    if (error) throw error;
    
    // If no friend requests, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extract all to_user_id values
    const userIds = data.map(request => request.to_user_id);
    
    // Fetch users matching those IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, wallet_address, avatar_url, trust_score_status, created_at, updated_at')
      .in('id', userIds);
    
    if (usersError) throw usersError;
    
    return users || [];
  }

  async getPendingRequests(wallet_address) {
    const { data: authUser, error: signerErr } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', wallet_address)
      .single();
    

    if (signerErr) {
      if (signerErr.code === 'PGRST116') {
        throw new Error('Mismatch Payload'); // no matching user
      }
      throw signerErr;
    }
    
    const { data, error } = await supabase
    .from('friend_requests')
    .select('to_user_id')
    .eq('from_user_id', authUser.id)
    .eq('status', "pending");

    if (error) throw error;
    
    // If no pending friend requests, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extract all to_user_id values
    const userIds = data.map(request => request.to_user_id);
    
    // Fetch users matching those IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, wallet_address, avatar_url, trust_score_status, created_at, updated_at')
      .in('id', userIds);
    
    if (usersError) throw usersError;
    
    return users || [];
  }
  
  async cancelRequestOrRemoveFriend(signer, signature, message) {
    // Decode and parse the stringified JSON message
    let decodedFriendRequestId;
    try {
      // Parse the stringified JSON message to extract to_user_id
      const parsedMessage = JSON.parse(message);
      decodedFriendRequestId = parsedMessage.id;
      
      if (!decodedFriendRequestId) {
        throw new Error('Provide friend request id');
      }
    } catch (error) {
      if (error.message === 'Mismatch Payload') {
        throw error;
      }
      throw new Error('Mismatch Payload');
    }

    // 4. Delete the record
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', decodedFriendRequestId);

    if (deleteError) throw deleteError;

    return true;
  }
  
  async acceptRequest(wallet_address, message, signature) {
    const { data: authUser, error: signerErr } = await supabase
      .from('users')
      .select('id, wallet_address, to_user_id')
      .eq('wallet_address', wallet_address)
      .single();

    if (signerErr) {
      if (signerErr.code === 'PGRST116') {
        throw new Error('Mismatch Payload'); // no matching user
      }
      throw signerErr;
    }

    try {
      // Parse the stringified JSON message to extract to_user_id
      const parsedMessage = JSON.parse(message);
      decodedRequestId = parsedMessage.id;
      
      if (!decodedRequestId) {
        throw new Error('Provide request id');
      }
    } catch (error) {
      if (error.message === 'Mismatch Payload') {
        throw error;
      }
      throw new Error('Mismatch Payload');
    }

    // 4. Update the record
    const { data, error } = await supabase
      .from('friend_requests')
      .update([{ status: "accepted", responded_at: new Date().toISOString()}])
      .eq('id', decodedRequestId)
      .select('id, from_user_id, to_user_id, status, responded_at')
      .single();

    if (error) throw error;

    return true;
  }

  async sendFriendRequest(wallet_address, message, signature) {
    const { data: authUser, error: signerErr } = await supabase
      .from('users')
      .select('id, wallet_address, to_user_id')
      .eq('wallet_address', wallet_address)
      .single();

    if (signerErr) {
      if (signerErr.code === 'PGRST116') {
        throw new Error('Mismatch Payload'); // no matching user
      }
      throw signerErr;
    }

    try {
      // Parse the stringified JSON message to extract to_user_id
      const parsedMessage = JSON.parse(message);
      decodedToUserId = parsedMessage.to_user_id;
      
      if (!decodedToUserId) {
        throw new Error('Provide user id');
      }
    } catch (error) {
      if (error.message === 'Mismatch Payload') {
        throw error;
      }
      throw new Error('Mismatch Payload');
    }

    // 4. Create the record
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ from_user_id: authUser.id, to_user_id: decodedToUserId, status: "pending", signature}])
      .select('from_user_id, to_user_id, status')
      .single();

    if (error) throw error;

    return true;
  }
}

module.exports = new FriendService();