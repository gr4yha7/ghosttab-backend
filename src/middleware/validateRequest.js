const { ethers } = require('ethers');

const validateRequest = (req, res, next) => {
  const { signer, signature, message } = req.body;
  
  // Validate required fields
  if (!signer || !signature || !message) {
    return res.status(400).json({
      success: false,
      error: 'signer, signature, and message are required'
    });
  }
  
  // Validate signer is a valid Ethereum address
  if (!ethers.isAddress(signer)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid signer address format'
    });
  }
  
  try {
    // Recover the signer from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Normalize addresses to lowercase for comparison (Ethereum addresses are case-insensitive)
    const normalizedRecovered = recoveredAddress.toLowerCase();
    const normalizedSigner = signer.toLowerCase();
    
    // Verify the recovered signer matches the claimed signer
    if (normalizedRecovered !== normalizedSigner) {
      return res.status(401).json({
        success: false,
        error: 'Signature verification failed: signer mismatch'
      });
    }
    
    // Attach the verified signer to the request for use in controllers
    req.verifiedSigner = normalizedSigner;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid signature format or verification failed',
      details: error.message
    });
  }
};

module.exports = { validateRequest };