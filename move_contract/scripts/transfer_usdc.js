const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

async function directUSDCTransfer() {
  const config = new AptosConfig({ 
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
  });
  const aptos = new Aptos(config);

  const privateKeyHex = "ed25519-priv-e3f99d41f0a48424064ca87035b287313b23be7d8218396846be10146e72500f";
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const USDC_METADATA = "0xb89077cfd2a82a0c1450534d49cfd5f2707643155273069bc23a912bcfefdee7";
  const RECIPIENT = "0x03842b58e83a22f97d49fe3acfb401421c86bc88f37634e652a14279b6b98d4e";
  const AMOUNT = 2000000; // 1 USDC

  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: "0x1::primary_fungible_store::transfer",
      typeArguments: ["0x1::fungible_asset::Metadata"],
      functionArguments: [USDC_METADATA, RECIPIENT, AMOUNT],
    },
  });

  const result = await aptos.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  console.log("Transfer complete:", result.hash);
}

directUSDCTransfer();