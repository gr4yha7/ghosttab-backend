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

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Token verification failed',
      details: error
    });
  }
};

const validateUser = async (req, res, next) => {
  const privyClient = await getPrivyClient();

  const idToken = req.headers['privy-id-token'];

  if (!idToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    // Parse and verify the token
    const user = await privyClient.users().get({ id_token: idToken });
    req.user = user;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Token',
      details: error
    });
  }

};

module.exports = { authRequest, validateUser };