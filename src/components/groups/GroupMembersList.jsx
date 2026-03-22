import React from "react";
import { formatAmount } from "../../utils/formatters";

const GroupMembersList = ({ members, publicKey }) => {
  return (
    <div style={{ width: "100%" }}>
      {members.map((m) => (
        <div
          key={m.address}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0.35rem 0",
          }}
        >
          <span>
            {m.address === publicKey ? "You (" + m.name + ")" : m.name}
          </span>
          <strong>{formatAmount(m.balance)} XLM</strong>
        </div>
      ))}
    </div>
  );
};

export default GroupMembersList;
