import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export const toU32 = (v) => nativeToScVal(Number(v), { type: "u32" });

export const toI128 = (v) =>
  nativeToScVal(BigInt(Math.floor(parseFloat(v || 0) * 1e7)), { type: "i128" });

export const toString = (v) => nativeToScVal(v, { type: "string" });

export const toAddressVec = (arr) =>
  xdr.ScVal.scvVec(arr.map((a) => new Address(a).toScVal()));
