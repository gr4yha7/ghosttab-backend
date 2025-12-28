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

class UserService {
  async getAllUsers() {
  const privyClient = await getPrivyClient();

  try {
    const users = await privyClient.users().list();
    return users;
  } catch (error) {
    throw error
  }
  }

  async getUserById(wallet) {
    const privyClient = await getPrivyClient();

    if (!wallet) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Parse and verify the token
        const user = await privyClient.users().get({ getByWalletAddress: wallet });
        return user;
      } catch (error) {
        throw error
      }
  }


  async updateUser(id, username, country, avatar_url) {
    const privyClient = await getPrivyClient();

    try {
        // Parse and verify the token
        const user = await privyClient.users().setCustomMetadata(id, {
            custom_metadata: {
            username: username,
            country: country,
            avatar_url: avatar_url
            }
        });
        return user;
      } catch (error) {
        throw error
      }
      }

}

module.exports = new UserService();