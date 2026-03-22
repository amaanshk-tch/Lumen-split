import { Horizon, rpc } from "@stellar/stellar-sdk";
import { HORIZON_URL, SOROBAN_RPC_URL } from "../utils/constants";

export const server = new Horizon.Server(HORIZON_URL);
export const soroban = new rpc.Server(SOROBAN_RPC_URL);
