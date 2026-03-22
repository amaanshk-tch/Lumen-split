import React from "react";

const StatusBanner = ({ status, statusType, setStatus }) => {
  if (!status) return null;

  return (
    <div className={`status ${statusType}`}>
      <span className="status-text">{status}</span>
      <button className="status-close" onClick={() => setStatus("")}>
        ×
      </button>
    </div>
  );
};

export default StatusBanner;
