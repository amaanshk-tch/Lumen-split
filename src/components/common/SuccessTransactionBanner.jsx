import React from "react";

const SuccessTransactionBanner = ({ lastTxHash, activeTab, lastTxTab, updateStatus }) => {
  if (!lastTxHash || activeTab !== lastTxTab) return null;

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "0.75rem",
        background: "rgba(46, 204, 113, 0.1)",
        border: "1px solid rgba(46, 204, 113, 0.3)",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#2ecc71",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          textAlign: "left",
          wordBreak: "break-all",
          paddingRight: "1rem",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
          Transaction Successful
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            opacity: 0.8,
            fontFamily: "monospace",
          }}
        >
          Hash: <span style={{ userSelect: "all" }}>{lastTxHash}</span>
        </span>
      </div>
      <button
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: "0.25rem",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
        onClick={() => {
          navigator.clipboard.writeText(lastTxHash);
          updateStatus("Hash copied to clipboard!", "success");
        }}
        title="Copy Hash"
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </div>
  );
};

export default SuccessTransactionBanner;
