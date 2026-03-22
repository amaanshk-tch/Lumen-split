import {
  Account,
  Address,
  Contract,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { soroban } from "./stellarService";
import { signWithFreighter, signWithAlbedo } from "./walletService";
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  NETWORK_LABEL,
  WALLET_TYPES,
  SOROBAN_RPC_URL,
} from "../utils/constants";
import { safeDecode } from "../utils/helpers";

export const callRead = async (publicKey, method, args = []) => {
  if (!publicKey) return null;
  const contract = new Contract(CONTRACT_ID);
  const sim = await soroban.simulateTransaction(
    new TransactionBuilder(new Account(publicKey, "0"), {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build(),
  );
  if (!sim.result || sim.error || sim.result.error) return null;
  return safeDecode(sim.result.retval);
};

export const signAndSubmit = async (publicKey, selectedWallet, buildFn) => {
  const tx = buildFn(new Account(publicKey, "0")).build();
  const { server } = await import("./stellarService");
  
  let account;
  try {
    account = await server.loadAccount(publicKey);
  } catch (e) {
    if (e?.response?.status === 404 || (e?.message && e.message.includes("404"))) {
      throw new Error("Account not funded");
    } else {
      throw e;
    }
  }

  const realTx = buildFn(account).build();
  const prepared = await soroban.prepareTransaction(realTx);
  let signed;

  if (selectedWallet === WALLET_TYPES.FREIGHTER) {
    signed = await signWithFreighter(prepared.toXDR());
  } else if (selectedWallet === WALLET_TYPES.ALBEDO) {
    signed = await signWithAlbedo(prepared.toXDR());
  }

  const finalTx = TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE);
  const result = await (finalTx instanceof Transaction 
    ? soroban.sendTransaction(finalTx)
    : soroban.sendTransaction(new Transaction(signed, NETWORK_PASSPHRASE)));

  if (result.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(result.errorResultXdr || result)}`);
  }

  let attempts = 0;
  while (attempts < 100) {
    let status = "PENDING";
    try {
      const rawResp = await fetch(SOROBAN_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "getTransaction",
          params: { hash: result.hash },
        }),
      });
      const json = await rawResp.json();
      status = json?.result?.status || "PENDING";
    } catch (e) {
      try {
        const sdkResp = await soroban.getTransaction(result.hash);
        status = sdkResp.status;
      } catch {}
    }

    const upStatus = String(status || "PENDING").toUpperCase();
    if (upStatus === "SUCCESS") return result.hash;
    if (upStatus === "FAILED") throw new Error("Transaction failed on-chain");

    await new Promise((resolve) => setTimeout(resolve, 150));
    attempts++;
  }
  throw new Error("Confirmation timeout (check history)");
};
