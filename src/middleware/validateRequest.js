// Use dynamic import for ES module package (lazy initialization)
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

const authRequest = async (req, res, next) => {
  const privyClient = await getPrivyClient();

  const authToken = req.headers.authorization?.replace('Bearer ', '');

  try {
    const authValid = await privyClient.utils().auth().verifyAuthToken(authToken);
    req.user_id = authValid.user_id.replace(/^did:privy:/, '');
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Token verification failed',
      details: error
    });
  }
};

module.exports = { authRequest };