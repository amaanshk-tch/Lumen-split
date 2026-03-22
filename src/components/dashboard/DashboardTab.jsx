import React from "react";
import { formatAmount } from "../../utils/formatters";
import GroupSelector from "../groups/GroupSelector";

const DashboardTab = ({
  selectedGroupId,
  setSelectedGroupId,
  loadGroup,
  groups,
  selectedGroup,
  publicKey,
  refreshGroups,
  isBusy,
}) => {
  return (
    <div className="form-group">
      <h3>Wallet Dashboard</h3>
      <p className="tab-hint">View your active group balances.</p>
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        loadGroup={loadGroup}
      />
      {selectedGroup && (
        <div style={{ width: "100%", marginTop: "1rem" }}>
          {selectedGroup.members.map((m) => (
            <div
              key={m.address}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.35rem 0",
                background:
                  m.address === publicKey
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
              }}
            >
              <span>
                {m.address === publicKey ? "You (" + m.name + ")" : m.name}
              </span>
              <strong>{formatAmount(m.balance)} XLM</strong>
            </div>
          ))}
        </div>
      )}
      <button
        className="button secondary"
        onClick={refreshGroups}
        disabled={isBusy}
        style={{ marginTop: "1rem" }}
      >
        Refresh
      </button>
    </div>
  );
};

export default DashboardTab;
