const gasSponsor = require('../services/gasSponsor.cjs');

class GasSponsorController {
  async sponsorGasTransaction(req, res, next) {
    try {
      const { transaction, senderAuth } = req.body;
      
      const pendingTransaction = await gasSponsor.sponsorTransaction(transaction, senderAuth);
      if (pendingTransaction) {
        res.json({ 
          success: true, 
          hash: pendingTransaction,
          message: 'Transaction submitted successfully'
        });
      }

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GasSponsorController();