const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

async function createTab() {
  // Configure for Movement testnet
  const config = new AptosConfig({ 
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
  });
  const aptos = new Aptos(config);

  // Load your account from private key
  const privateKeyHex = "ADMIN_PRIVATE_KEY"; // Replace with your actual private key
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  console.log("Creating tab from account:", account.accountAddress.toString());

  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
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

    const committedTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("✅ Transaction submitted:", committedTransaction.hash);

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    console.log("✅ Transaction status:", executedTransaction.success ? "SUCCESS" : "FAILED");
    console.log("🔍 View on explorer: https://explorer.movementnetwork.xyz/txn/" + committedTransaction.hash);
    
  } catch (error) {
    console.error("❌ Error creating tab:", error);
  }
}

createTab();