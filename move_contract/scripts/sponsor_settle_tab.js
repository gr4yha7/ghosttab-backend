const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

async function createTab() {
  const apiEndpoint = 'http://localhost:3000/api/gasSponsor/sponsorAndSubmitTx';

  // Configure for Movement testnet
  const config = new AptosConfig({ 
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
  });
  const aptos = new Aptos(config);

  // Load your account from private key
  const privateKeyHex = "YOUR_PRIVATE_KEY"; // Replace with your actual private key
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const REGISTRY_ADDRESS = "0x1abde24a62871764cc91433ecaacefc18bd1ecf9775442ebea0f50a4c2d87bc8";
  const TAB_ID = 2;

  try {

    // Get tab details
    console.log("\n1️⃣ Fetching tab details...");
    const tab = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::tab_manager::get_tab_by_id`,
        functionArguments: [REGISTRY_ADDRESS, TAB_ID],
      },
    });

    console.log("✅ Tab found:", tab[0].title);

    // Get member details
    console.log("\n2️⃣ Fetching your member details...");
    const memberDetails = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::tab_manager::get_tab_member_details`,
        functionArguments: [REGISTRY_ADDRESS, TAB_ID, account.accountAddress.toString()],
      },
    });

    const shareAmount = Number(memberDetails[0].share_amount);
    console.log("   Share Amount:", shareAmount / 1000000, "USDC");
    console.log("   Status:", memberDetails[0].status);

    if (memberDetails[0].status === "settled") {
      console.log("\n✅ Already settled!");
      return;
    }

    // Calculate total payment (including potential penalty)
    const currentTime = Math.floor(Date.now() / 1000);
    const deadline = Number(tab[0].settlement_deadline);
    const penaltyRate = Number(tab[0].penalty_rate);
    
    let penalty = 0;
    if (currentTime > deadline && penaltyRate > 0) {
      const daysLate = Math.floor((currentTime - deadline) / 86400);
      penalty = Math.floor((shareAmount * penaltyRate * daysLate) / 10000);
    }

    const totalPayment = shareAmount + penalty;

    console.log("\n4️⃣ Payment breakdown:");
    console.log("   Share:", shareAmount / 1000000, "USDC");
    console.log("   Penalty:", penalty / 1000000, "USDC");
    console.log("   Total:", totalPayment / 1000000, "USDC");

    console.log("\n5️⃣ Submitting settlement transaction...");
    
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      withFeePayer: true,
      data: {
        function: `${REGISTRY_ADDRESS}::tab_manager::settle_tab`,
        functionArguments: [REGISTRY_ADDRESS, TAB_ID, shareAmount],
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
    

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                transaction: transactionHex,
                senderAuth: senderAuthHex
              }),
        });

        // Still need to check for HTTP errors manually as fetch only rejects on network errors
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Success:', data);
        console.log("✅ Transaction submitted:", data.hash.hash);
    
        const executedTransaction = await aptos.waitForTransaction({
          transactionHash: data.hash.hash,
        });
    
        console.log("✅ Transaction status:", executedTransaction.success ? "SUCCESS" : "FAILED");
        console.log("🔍 View on explorer: https://explorer.movementnetwork.xyz/txn/" + data.hash.hash);

    } catch (error) {
        console.error('Error:', error);
    }

    
  } catch (error) {
    console.error("❌ Error creating tab:", error);
  }
}

createTab();