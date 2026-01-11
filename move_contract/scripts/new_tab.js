const { Aptos, AptosConfig } = require("@aptos-labs/ts-sdk");

/**
 * Movement testnet configuration
 */
const MOVEMENT_TESTNET_RPC =
  "https://testnet.movementnetwork.xyz/v1";

const USDC_FUNGIBLE_ASSET_ADDRESS =
  "0xb89077cfd2a82a0c1450534d49cfd5f2707643155273069bc23a912bcfefdee7";



async function main() {
  const ACCOUNT_ADDRESS = "0x03842b58e83a22f97d49fe3acfb401421c86bc88f37634e652a14279b6b98d4e"; // replace

  const config = new AptosConfig({
          network: "CUSTOM",
          fullnode: MOVEMENT_TESTNET_RPC,
          indexer: 'https://hasura.testnet.movementnetwork.xyz/v1/graphql'
        });
        const aptos = new Aptos(config);
        const faBalance = await aptos.getCurrentFungibleAssetBalances({
          options: {
            where: {
              owner_address: { _eq: ACCOUNT_ADDRESS },
              asset_type: { _eq: USDC_FUNGIBLE_ASSET_ADDRESS }
            }
          }
        });

    console.log("faBalance", faBalance)

  // const result = await fetchMovementUSDCBalance(ACCOUNT_ADDRESS);

  // console.log(`USDC Balance: ${result.balance}`);
}

if (require.main === module) {
  main().catch(console.error);
}


