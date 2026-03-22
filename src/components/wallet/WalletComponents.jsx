import React from "react";
import { WALLET_TYPES } from "../../utils/constants";
import { short } from "../../utils/helpers";

// 1. ConnectWalletScreen Component
export const ConnectWalletScreen = ({ connectWallet }) => {
  return (
    <div className="connect-wallet-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '2.5rem',
      padding: '1rem 0'
    }}>
      <button className="button connect-main-btn" onClick={connectWallet} style={{ margin: '0 auto' }}>
        Connect Wallet
      </button>
      <div className="footer" style={{ marginTop: '0.5rem' }}>Split bills not friendships.</div>
    </div>
  );
};

// WalletHeader Component
export const WalletHeader = ({
  selectedWallet,
  publicKey,
  xlmBalance,
  groupsCount,
  isRegistered,
  registeredName,
  isCheckingReg,
  disconnect,
}) => {
  return (
    <div className="wallet-component-section">
      <div className="wallet-header-row">
        <div className="wallet-info-block">
          <div className="wallet-label-row">
            <span className="wallet-badge">{selectedWallet}</span>
            <span className="wallet-badge success">Member</span>
          </div>
          <div className="address-line">{short(publicKey)}</div>
          <div
            className="balance-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <div className="balance-item">
              <div className="balance-label">Native XLM</div>
              <div className="xlm-balance">
                <strong>{xlmBalance}</strong>
              </div>
            </div>
            <div className="balance-item">
              <div className="balance-label">Groups</div>
              <div className="contract-balance">
                <strong>{groupsCount}</strong>
              </div>
            </div>
          </div>
          {isCheckingReg ? (
            <div className="warning-pill" style={{ opacity: 0.7 }}>
              Checking profile...
            </div>
          ) : isRegistered ? (
            <div className="profile-badge">
              <span className="name-tag">{registeredName}</span>
            </div>
          ) : (
            <div className="warning-pill">Profile not registered</div>
          )}
        </div>
        <button className="disconnect-link" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </div>
  );
};

// WalletModal Component
export const WalletModal = ({ setShowWalletModal, connectWithWallet }) => {
  return (
    <div
      className="modal-overlay"
      onClick={() => setShowWalletModal(false)}
    >
      <div
        className="wallet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wallet-modal-header">
          <span className="wallet-modal-title">Connect a wallet</span>
          <button
            className="wallet-modal-close"
            onClick={() => setShowWalletModal(false)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="wallet-options">
          <button
            className="wallet-option"
            onClick={() => connectWithWallet(WALLET_TYPES.FREIGHTER)}
          >
            <span className="wallet-option-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#a5b4fc'}}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              Freighter
            </span>
            <span className="wallet-option-tag">Extension</span>
          </button>
          <button
            className="wallet-option"
            onClick={() => connectWithWallet(WALLET_TYPES.ALBEDO)}
          >
            <span className="wallet-option-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#6ee7b7'}}>
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              Albedo
            </span>
            <span className="wallet-option-tag web">Web</span>
          </button>
        </div>
      </div>
    </div>
  );
};
