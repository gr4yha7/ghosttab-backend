const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

async function settleTab() {
  const config = new AptosConfig({ 
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
  });
  const aptos = new Aptos(config);

  const privateKeyHex = "YOUR_PRIVATE_KEY"; // Replace with your actual private key
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const REGISTRY_ADDRESS = "0x1abde24a62871764cc91433ecaacefc18bd1ecf9775442ebea0f50a4c2d87bc8";
  const TAB_ID = 2;

  console.log("Account:", account.accountAddress.toString());
  console.log("=" .repeat(60));

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
      data: {
        function: `${REGISTRY_ADDRESS}::tab_manager::settle_tab`,
        functionArguments: [REGISTRY_ADDRESS, TAB_ID, shareAmount],
      },
    });

    const committedTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("\n✅ Transaction submitted:", committedTransaction.hash);

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (executedTransaction.success) {
      console.log("✅ Settlement successful!");
    } else {
      console.log("❌ Transaction failed:", executedTransaction.vm_status);
    }
    
    console.log("🔍 View: https://explorer.movementnetwork.xyz/txn/" + committedTransaction.hash);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message || error);
    
    if (error.message && error.message.includes("E_INSUFFICIENT_BALANCE")) {
      console.log("\n💡 The contract says you don't have enough USDC balance.");
      console.log("   This could mean:");
      console.log("   1. You don't have the USDC fungible asset initialized");
      console.log("   2. The USDC metadata address in the contract is wrong");
      console.log("   3. You actually don't have enough USDC");
    }
  }
}

settleTab();