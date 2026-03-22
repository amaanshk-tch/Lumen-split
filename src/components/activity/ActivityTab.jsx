import React from "react";
import GroupSelector from "../groups/GroupSelector";
import { formatAmount } from "../../utils/formatters";
import { short } from "../../utils/helpers";

// RecentTransactionsList Component
const RecentTransactionsList = ({ recentTransactions, updateStatus }) => {
  if (!recentTransactions || recentTransactions.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: "2rem",
        width: "100%",
        textAlign: "left",
      }}
    >
      <h3>Recent Transactions</h3>
      <p className="tab-hint">Your recent transactions from this session.</p>
      {recentTransactions.map((tx, idx) => (
        <div
          key={idx}
          style={{
            padding: "0.75rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "0.9rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.25rem",
            }}
          >
            <span
              style={{
                color: "var(--accent-glow)",
                fontWeight: "bold",
              }}
            >
              {tx.action}
            </span>
            <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>
              {new Date(tx.timestamp).toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: 0.9,
              marginTop: "0.4rem",
              padding: "0.5rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "4px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                paddingRight: "1rem",
                userSelect: "all",
              }}
            >
              {tx.hash}
            </span>
            <button
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "0.25rem",
                margin: 0,
                opacity: 0.7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => {
                navigator.clipboard.writeText(tx.hash);
                updateStatus("Hash copied!", "success");
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
        </div>
      ))}
    </div>
  );
};

// GroupActivityList Component
const GroupActivityList = ({ activities, members }) => {
  if (!activities || activities.length === 0) {
    return <p className="tab-hint">No activity yet.</p>;
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        width: "100%",
        textAlign: "left",
      }}
    >
      {activities.map((a) => (
        <div
          key={a.id}
          style={{
            padding: "0.75rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.9rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.25rem",
            }}
          >
            <span
              style={{
                color: "var(--accent-glow)",
                fontWeight: "bold",
              }}
            >
              #{a.id} {a.kind}
            </span>
            <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>
              {new Date(a.timestamp * 1000).toLocaleString()}
            </span>
          </div>
          <div style={{ opacity: 0.9 }}>
            <strong>
              {members.find((m) => m.address === a.actor)?.name ||
                short(a.actor)}
            </strong>
            {a.kind === "Expense" &&
              ` added an expense of ${formatAmount(a.amount)} XLM`}
            {a.kind === "Settlement" &&
              ` paid ${formatAmount(a.amount)} XLM to ${members.find((m) => m.address === a.recipient)?.name || short(a.recipient)}`}
            {a.kind === "MemberAdded" &&
              (a.amount === 0
                ? ` created the group`
                : ` added ${members.find((m) => m.address === a.recipient)?.name || short(a.recipient)}`)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ActivityTab (Main Entry)
const ActivityTab = ({
  recentTransactions,
  updateStatus,
  selectedGroupId,
  setSelectedGroupId,
  loadGroup,
  groups,
  selectedGroup,
  activities,
}) => {
  return (
    <div className="form-group">
      <h2 style={{ marginBottom: "1.5rem", textAlign: "left" }}>Activity Tab</h2>

      <RecentTransactionsList
        recentTransactions={recentTransactions}
        updateStatus={updateStatus}
      />

      <h3 style={{ marginTop: "2rem" }}>Group Activity List</h3>
      <p className="tab-hint">Recent actions within the group.</p>
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        loadGroup={loadGroup}
      />
      {selectedGroup && (
        <GroupActivityList
          activities={activities}
          members={selectedGroup.members}
        />
      )}
    </div>
  );
};

export default ActivityTab;
