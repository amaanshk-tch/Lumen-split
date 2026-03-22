import { scValToNative, xdr } from "@stellar/stellar-sdk";

export const short = (addr) => (addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "");

export const safeDecode = (val) => {
  if (!val) return val;
  try {
    if (typeof val.switch === "function") {
      return scValToNative(val);
    }
    if (typeof val === "string") {
      const likelyXDR = /^(AAAA|AAAAC|AAAAE|AAAAA)/.test(val);
      if (likelyXDR && val.length >= 8) {
        try {
          return scValToNative(xdr.ScVal.fromXDR(val, "base64"));
        } catch (inner) {
          return val;
        }
      }
    }
    return val;
  } catch (e) {
    console.debug("safeDecode skipped for value:", val);
    return val;
  }
};

export const parseList = (value) => [
  ...new Set(
    value
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter((v) => v.startsWith("G")),
  ),
];
