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
  Ed25519PrivateKey,
  Account,
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
   * Fetches transaction from blockchain and validates its status
   */
  async verifyTransaction(txHash: string): Promise<{
    confirmed: boolean;
    fromAddress?: string;
    toAddress?: string;
    amount?: string;
    blockNumber?: number;
    assetMetadata?: string;
  }> {
    try {
      logger.info('Verifying transaction on Movement Network', { txHash });

      // Fetch transaction from Movement Network using Aptos SDK
      const transaction = await aptos.getTransactionByHash({
        transactionHash: txHash
      });

      // Check if transaction is successful
      let isConfirmed = false;

      if ('success' in transaction) {
        isConfirmed = transaction.success === true;

        if (!isConfirmed) {
          logger.warn('Transaction found but not successful', {
            txHash,
            success: transaction.success,
            vmStatus: transaction.vm_status
          });
        }
      } else {
        // Pending transaction - not confirmed yet
        logger.warn('Transaction is still pending', { txHash });
      }

      // Extract details from transaction payload
      let fromAddress: string | undefined;
      let toAddress: string | undefined;
      let amount: string | undefined;
      let blockNumber: number | undefined;
      let assetMetadata: string | undefined;

      if (transaction.type === 'user_transaction') {
        fromAddress = transaction.sender;
        blockNumber = parseInt(transaction.version);

        const payload = transaction.payload as any;

        // Handle fungible asset transfers (USDC, etc.)
        if (payload?.function === '0x1::primary_fungible_store::transfer') {
          // Arguments: [metadata, recipient, amount]
          assetMetadata = payload.arguments?.[0];
          toAddress = payload.arguments?.[1];
          amount = payload.arguments?.[2]?.toString();

          logger.info('Fungible asset transfer verified', {
            txHash,
            from: fromAddress,
            to: toAddress,
            amount,
            assetMetadata,
            confirmed: isConfirmed
          });
        }
        // Handle native APT transfers
        else if (payload?.function === '0x1::aptos_account::transfer') {
          // Arguments: [recipient_address, amount_in_octas]
          toAddress = payload.arguments?.[0];
          amount = payload.arguments?.[1]?.toString();

          logger.info('APT transfer verified', {
            txHash,
            from: fromAddress,
            to: toAddress,
            amount,
            confirmed: isConfirmed
          });
        } else {
          logger.warn('Transaction is not a standard transfer', {
            txHash,
            function: payload?.function
          });
        }
      } else {
        logger.warn('Transaction is not a user transaction', {
          txHash,
          type: transaction.type
        });
      }

      return {
        confirmed: isConfirmed,
        fromAddress,
        toAddress,
        amount,
        blockNumber,
        assetMetadata,
      };
    } catch (error: any) {
      // Handle specific error cases
      if (error?.status === 404 || error?.message?.includes('not found')) {
        logger.error('Transaction not found on blockchain', { txHash });
        throw new Error('Transaction not found on blockchain');
      }

      logger.error('Failed to verify transaction', { txHash, error: error?.message || error });
      throw new Error('Failed to verify blockchain transaction');
    }
  }

  /**
   * Generate transaction hash for signing
   */
  async generateHash(
    sender: string,
    amount: number,
  ): Promise<{
    success: boolean,
    hash: string,
    rawTxnHex: string,
  }> {
    try {
      const senderAddress = AccountAddress.from(sender);
      const rawTxn = await aptos.transaction.build.simple({
        sender: senderAddress,
        data: {
          function: "0x1::primary_fungible_store::transfer",
          typeArguments: ["0x1::fungible_asset::Metadata"],
          functionArguments: [config.movement.usdcAddress, config.movement.ghosttabSettlementAddress, amount],
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
   * Get wallet USDC balance
   */
  async getUSDCBalance(walletAddress: string): Promise<number> {
    try {
      logger.info('Getting USDC balance', { walletAddress });
      const balanceResponse = await aptos.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: walletAddress },
            asset_type: { _eq: config.movement.usdcAddress }
          }
        }
      });

      const USDC_DECIMALS = 6;
      if (!balanceResponse || balanceResponse.length === 0) {
        logger.info('No USDC balance record found for wallet', { walletAddress });
        return 0;
      }

      const balance = balanceResponse[0].amount / 10 ** USDC_DECIMALS;
      return balance;
    } catch (error) {
      logger.warn('Indexer failed to get USDC balance, falling back to view function', { walletAddress });
      try {
        const result = await aptos.view({
          payload: {
            function: "0x1::primary_fungible_store::balance",
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: [walletAddress, config.movement.usdcAddress],
          },
        });

        const USDC_DECIMALS = 6;
        const amount = Number(result[0]);
        return amount / 10 ** USDC_DECIMALS;
      } catch (viewError) {
        console.error('DEBUG: View function also failed:', JSON.stringify(viewError, Object.getOwnPropertyNames(viewError)));
        logger.error('Failed to get wallet USDC balance via both indexer and view', {
          walletAddress,
          error: viewError instanceof Error ? viewError.message : String(viewError),
        });
        throw new Error('Failed to get wallet USDC balance');
      }
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

  async createTabTxSignature() {
    const privateKeyHex = "The ADMIN_PRIVATE_KEY"; // Replace with your actual private key
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });

    console.log("Creating tab from account:", account.accountAddress.toString());

    try {
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        withFeePayer: true,
        data: {
          function: "0x1abde24a62871764cc91433ecaacefc18bd1ecf9775442ebea0f50a4c2d87bc8::tab_manager::create_tab",
          functionArguments: [
            "0x1abde24a62871764cc91433ecaacefc18bd1ecf9775442ebea0f50a4c2d87bc8", // registry_address
            "Restaurant Bill 2", // title
            "Splitting the dinner bill from Friday night", // description
            2000000, // total_amount (2 USDC with 6 decimals)
            "0x03842b58e83a22f97d49fe3acfb401421c86bc88f37634e652a14279b6b98d4e", // settler_wallet
            "group_xyz", // group_id
            1736640000, // settlement_deadline (Unix timestamp)
            500, // penalty_rate (5% in basis points)
            "Food", // category
            "stream_channel_001", // stream_channel_id
            ["privy_alice", "privy_bob"], // member_privy_ids (vector)
            [
              "0x1abde24a62871764cc91433ecaacefc18bd1ecf9775442ebea0f50a4c2d87bc8",
              "0xa2e0c299a145db4405b8d8922a45f075e8c6075aa79d8164170426dfde2913ef"
            ], // member_wallets (vector)
            [1000000, 1000000] // member_amounts (vector - 1 USDC each)
          ],
        },
      });


      const senderAuth = aptos.transaction.sign({
        signer: account,
        transaction: transaction
      });

      // Serialize to bytes for sending to backend
      const transactionBytes = transaction.bcsToBytes();
      const senderAuthBytes = senderAuth.bcsToBytes();

      // Convert to hex strings for JSON serialization
      const transactionHex = Buffer.from(transactionBytes).toString('hex');
      const senderAuthHex = Buffer.from(senderAuthBytes).toString('hex');


      // try {
      //     const response = await fetch(apiEndpoint, {
      //         method: 'POST',
      //         headers: {
      //             'Content-Type': 'application/json',
      //         },
      //         body: JSON.stringify({ 
      //             transaction: transactionHex,
      //             senderAuth: senderAuthHex
      //           }),
      //     });

      //     // Still need to check for HTTP errors manually as fetch only rejects on network errors
      //     if (!response.ok) {
      //         throw new Error(`HTTP error! status: ${response.status}`);
      //     }

      //     const data = await response.json();
      //     console.log('Success:', data);
      //     console.log("✅ Transaction submitted:", data.hash.hash);

      //     const executedTransaction = await aptos.waitForTransaction({
      //       transactionHash: data.hash.hash,
      //     });

      //     console.log("✅ Transaction status:", executedTransaction.success ? "SUCCESS" : "FAILED");
      //     console.log("🔍 View on explorer: https://explorer.movementnetwork.xyz/txn/" + data.hash.hash);

      // } catch (error) {
      //     console.error('Error:', error);
      // }


    } catch (error) {
      console.error("❌ Error creating tab:", error);
    }
  }
}

export const blockchainService = new BlockchainService();