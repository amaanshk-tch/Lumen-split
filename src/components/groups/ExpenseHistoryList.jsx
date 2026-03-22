import React from "react";
import { formatAmount } from "../../utils/formatters";
import { short } from "../../utils/helpers";

const ExpenseHistoryList = ({ expenseHistory, members }) => {
  return (
    <div
      style={{
        marginTop: "1rem",
        width: "100%",
        textAlign: "left",
      }}
    >
      <h4>Expense History</h4>
      {expenseHistory.length === 0 && (
        <p className="tab-hint">No expenses yet.</p>
      )}
      {expenseHistory.map((e, i) => (
        <div
          key={i}
          style={{
            padding: "0.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.9rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              <strong>
                {members.find((m) => m.address === e.payer)?.name ||
                  short(e.payer)}
              </strong>{" "}
              paid
            </span>
            <strong>{formatAmount(e.amount)} XLM</strong>
          </div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.8rem",
            }}
          >
            {new Date(e.timestamp * 1000).toLocaleString()} •{" "}
            {e.participants.length} participants
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExpenseHistoryList;
