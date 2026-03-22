import { useState, useCallback } from "react";
import { server } from "../services/stellarService";
import { connectFreighter, connectAlbedo } from "../services/walletService";
import { WALLET_TYPES } from "../utils/constants";

export const useWallet = (updateStatus) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [xlmBalance, setXlmBalance] = useState("0");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const fetchBalance = useCallback(async (pubkey) => {
    try {
      const acc = await server.loadAccount(pubkey);
      const native = acc.balances.find((b) => b.asset_type === "native");
      setXlmBalance(native ? Number(native.balance).toFixed(2) : "0.00");
    } catch {
      setXlmBalance("0.00");
      updateStatus("Account not funded. Please fund via Friendbot.", "error");
    }
  }, [updateStatus]);

  const connectWithWallet = async (walletType) => {
    updateStatus("Submitting...", "info");
    try {
      let pubkey = "";
      if (walletType === WALLET_TYPES.FREIGHTER) {
        pubkey = await connectFreighter();
      } else if (walletType === WALLET_TYPES.ALBEDO) {
        pubkey = await connectAlbedo();
      }

      if (!pubkey) {
        updateStatus("No address found", "error");
        return;
      }

      setPublicKey(pubkey);
      setSelectedWallet(walletType);
      await fetchBalance(pubkey);
      setConnected(true);
      setShowWalletModal(false);
      updateStatus("Connected Successfully!", "success");
    } catch {
      updateStatus("Connect failed", "error");
    }
  };

  const disconnect = useCallback(() => {
    setConnected(false);
    setPublicKey("");
    setSelectedWallet(null);
    setXlmBalance("0");
  }, []);

  return {
    connected,
    publicKey,
    xlmBalance,
    selectedWallet,
    showWalletModal,
    setShowWalletModal,
    connectWithWallet,
    disconnect,
    fetchBalance,
    setConnected,
    setPublicKey,
    setSelectedWallet
  };
};
