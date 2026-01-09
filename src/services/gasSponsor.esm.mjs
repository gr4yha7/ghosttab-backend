import { GasStationClient } from "@shinami/clients/aptos";
import {
  AccountAuthenticator,
  SimpleTransaction,
  Deserializer,
  Hex
} from "@aptos-labs/ts-sdk";

let gasSponsorStation = null;

async function getGasStationClient() {
  if (!gasSponsorStation) {
    gasSponsorStation = new GasStationClient(
      process.env.GAS_STATION_AND_WALLET_TESTNET_BE_KEY
    );
  }
  return gasSponsorStation;
}

export async function sponsorTransaction(transactionHex, senderAuthHex) {
  try {
    const gasSponsorClient = await getGasStationClient();

    console.log("Received transaction hex:", transactionHex);
    console.log("Received senderAuth hex:", senderAuthHex);

    // Deserialize the transaction
    const transactionBytes = Hex.fromHexString(transactionHex).toUint8Array();
    const simpleTx = SimpleTransaction.deserialize(
      new Deserializer(transactionBytes)
    );

    console.log("Deserialized transaction:", {
      sender: simpleTx.rawTransaction.sender.toString(),
      sequenceNumber: simpleTx.rawTransaction.sequence_number.toString(),
      maxGasAmount: simpleTx.rawTransaction.max_gas_amount.toString(),
      gasUnitPrice: simpleTx.rawTransaction.gas_unit_price.toString(),
      expirationTimestampSecs: simpleTx.rawTransaction.expiration_timestamp_secs.toString(),
    });

    // Deserialize the sender authenticator
    const senderAuthBytes = Hex.fromHexString(senderAuthHex).toUint8Array();
    const senderSig = AccountAuthenticator.deserialize(
      new Deserializer(senderAuthBytes)
    );

    console.log("Deserialized sender auth successfully");

    // Sponsor and submit
    console.log("Submitting to Shinami Gas Station...");
    console.log("tx", simpleTx);
    console.log("sig", senderSig);
    
    const result = await gasSponsorClient.sponsorAndSubmitSignedTransaction(
      simpleTx,
      senderSig
    );

    console.log("Transaction submitted successfully:", result);
    return result;

  } catch (error) {
    console.error("Error in sponsorTransaction:", error);
    
    // Log detailed error information
    if (error.response) {
      console.error("Response error:", error.response);
    }
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    throw error;
  }
}