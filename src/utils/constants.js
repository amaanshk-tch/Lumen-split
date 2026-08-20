export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

export const NETWORK_LABEL =
  import.meta.env.VITE_NETWORK_LABEL ?? "TESTNET";

export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ?? "CCQVUEHKGECRLHRW3BCJ5UMD4NUAEZC46HJOUX3CKDQBFEO3UTAZPIYW";

export const WALLET_TYPES = {
  FREIGHTER: "Freighter",
  ALBEDO: "Albedo",
};

export const STROOPS_PER_XLM = 10000000n;

export const ACTIVITY_TYPES = {
  Expense: "Expense",
  Settlement: "Settlement",
  MemberAdded: "MemberAdded",
  0: "Expense",
  1: "Settlement",
  2: "MemberAdded",
};
