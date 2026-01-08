import { logger } from '@ghosttab/common';
import { config } from '../config';
import {
  GasStationClient
} from "@shinami/clients/aptos";

import {
  AccountAddress,
  AccountAuthenticator,
  Aptos,
  AptosConfig,
  SimpleTransaction,
  Deserializer,
  Hex,
  Network,
  PendingTransactionResponse,
  AccountData,
  Ed25519Signature,
  Ed25519PublicKey,
  AccountAuthenticatorEd25519,
  generateSigningMessageForTransaction
} from "@aptos-labs/ts-sdk";
import { toHex } from 'viem';

const MOVEMENT_TESTNET_FULLNODE = 'https://testnet.movementnetwork.xyz/v1';

const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_TESTNET_FULLNODE,
});
const aptos = new Aptos(aptosConfig);
const gasStationClient = new GasStationClient(config.shinami.gasStationAccessKey)

export class BlockchainService {
  /**
   * Verify transaction on Movement Network
   * This is a placeholder - implement actual RPC calls based on Movement Network's API
   */
  async verifyTransaction(txHash: string): Promise<{
    confirmed: boolean;
    fromAddress?: string;
    toAddress?: string;
    amount?: string;
    blockNumber?: number;
  }> {
    try {
      // TODO: Implement actual Movement Network RPC call
      // Example using fetch:
      // const response = await fetch(config.movement.rpcUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     jsonrpc: '2.0',
      //     method: 'eth_getTransactionByHash', // or Movement equivalent
      //     params: [txHash],
      //     id: 1,
      //   }),
      // });
      // const data = await response.json();

      logger.info('Verifying transaction', { txHash });

      // Mock implementation - replace with actual verification
      return {
        confirmed: true,
        fromAddress: '0x...',
        toAddress: '0x...',
        amount: '100',
        blockNumber: 12345,
      };
    } catch (error) {
      logger.error('Failed to verify transaction', { txHash, error });
      throw new Error('Failed to verify blockchain transaction');
    }
  }

  /**
   * Generate transaction hash for signing
   */
  async generateHash(
    sender: string,
    func: `${string}::${string}::${string}`,
    typeArguments: any[],
    functionArguments: any[]
  ): Promise<{
    success: boolean,
    hash: string,
    rawTxnHex: string,
  }> {
    try {
      const senderAddress = AccountAddress.from(sender);

      // Build generic Move transaction
      const rawTxn = await aptos.transaction.build.simple({
        sender: senderAddress,
        data: {
          function: func,
          typeArguments: typeArguments || [],
          functionArguments,
        },
      });

      // Generate hash for Privy signing
      const message = generateSigningMessageForTransaction(rawTxn);
      const hash = toHex(message);

      const rawTxnHex = rawTxn.bcsToHex().toString();

      return {
        success: true,
        hash,
        rawTxnHex: rawTxnHex,
      };
    } catch (error) {
      logger.error('Failed to generate signing hash', { error });
      throw new Error('Failed to generate signing hash');
    }
  }

  /**
   * Submit signed transaction
   */
  async submitSignedTx(rawTxnHex: string, publicKey: string, signature: string): Promise<{
    success: boolean,
    transactionHash: string,
    vmStatus: string,
  }> {
    // Process the public key to ensure it's in the correct format
    let processedPublicKey = publicKey;

    // Remove 0x prefix if present
    if (processedPublicKey.toLowerCase().startsWith('0x')) {
      processedPublicKey = processedPublicKey.slice(2);
    }
    // Remove leading zeros if present (sometimes keys have 00 prefix)
    if (processedPublicKey.length === 66 && processedPublicKey.startsWith('00')) {
      processedPublicKey = processedPublicKey.substring(2);
    }
    // Ensure we have exactly 64 characters (32 bytes in hex)
    if (processedPublicKey.length !== 64) {
      throw new Error(`Invalid public key length: expected 64 characters, got ${processedPublicKey.length}. Key: ${processedPublicKey}`);
    }

    try {
      const senderAuthenticator = new AccountAuthenticatorEd25519(
        new Ed25519PublicKey(processedPublicKey),
        new Ed25519Signature(signature)
      );

      const backendRawTxn = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexInput(rawTxnHex).toUint8Array()));

      const pendingTxn = await aptos.transaction.submit.simple({
        transaction: backendRawTxn,
        senderAuthenticator: senderAuthenticator,
      });

      const executedTxn = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

      return {
        success: executedTxn.success,
        transactionHash: executedTxn.hash,
        vmStatus: executedTxn.vm_status,
      };
    } catch (error) {
      logger.error('Failed to submit transaction', { rawTxnHex, error });
      throw new Error('Failed to submit transaction');
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      logger.info('Getting balance', { walletAddress });
      const accountAddress = AccountAddress.from(walletAddress);
      const balance = await aptos.getAccountAPTAmount({ accountAddress });
      return balance;
    } catch (error) {
      logger.error('Failed to get balance', { walletAddress, error });
      throw new Error('Failed to get wallet balance');
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(walletAddress: string): Promise<AccountData> {
    try {
      logger.info('Getting account info', { walletAddress });
      const accountAddress = AccountAddress.from(walletAddress);
      const info = await aptos.getAccountInfo({ accountAddress });
      return info;
    } catch (error) {
      logger.error('Failed to get account info', { walletAddress, error });
      throw new Error('Failed to get account info');
    }
  }

  async sponsorTransaction(transaction: string, senderAuth: string): Promise<PendingTransactionResponse> {
    try {
      // Step 1: Sponsor and submit the transaction
      // First, deserialize the SimpleTransaction and sender AccountAuthenticator sent from the FE
      const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(transaction).toUint8Array()));
      const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(senderAuth).toUint8Array()));
      const pendingTransaction = await gasStationClient.sponsorAndSubmitSignedTransaction(simpleTx, senderSig);

      // Step 2: Send the PendingTransactionResponse back to the FE
      return pendingTransaction
    } catch (error) {
      logger.error('Failed to sponsor transaction', { transaction, error });
      throw new Error('Failed to sponsor transaction');
    }
  }
}

//  View function
// const result = await aptos.view({
//   payload: {
//       function: func, // Module address::module_name::function_name
//       typeArguments: typeArguments || [], // Type arguments if required
//       functionArguments: functionArguments || [], // Arguments for the function
//   },
// });

export const blockchainService = new BlockchainService();