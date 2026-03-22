import {
  getAddress,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";
import { WALLET_TYPES, NETWORK_LABEL, NETWORK_PASSPHRASE } from "../utils/constants";

export const connectFreighter = async () => {
  if (!(await isConnected())) {
    window.open("https://freighter.app", "_blank");
    return null;
  }
  await requestAccess();
  const addr = await getAddress();
  return addr?.address;
};

export const connectAlbedo = async () => {
  const resp = await albedo.publicKey({});
  return resp.pubkey;
};

export const signWithFreighter = async (xdr) => {
  const signedRaw = await signTransaction(xdr, {
    network: NETWORK_LABEL,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return (
    typeof signedRaw === "string"
      ? signedRaw
      : signedRaw?.signedTxXdr ||
        signedRaw?.signedTransaction ||
        signedRaw?.transaction ||
        signedRaw?.result
  );
};

export const signWithAlbedo = async (xdr) => {
  const resp = await albedo.tx({
    xdr: xdr,
    network: NETWORK_LABEL.toLowerCase(),
    submit: false,
  });
  return resp.signed_envelope_xdr;
};
