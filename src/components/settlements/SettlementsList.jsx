import React from "react";
import { formatAmount } from "../../utils/formatters";
import { short } from "../../utils/helpers";

const SettlementsList = ({ settlements, members }) => {
  if (!settlements || settlements.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        marginTop: "1rem",
        padding: "0.75rem",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "8px",
        textAlign: "left",
      }}
    >
      <h4>Settlements</h4>
      {settlements.map((s, i) => (
        <div
          key={i}
          style={{
            padding: "0.35rem 0",
            borderBottom:
              i < settlements.length - 1
                ? "1px solid rgba(255,255,255,0.05)"
                : "none",
          }}
        >
          {members.find((m) => m.address === s.from)?.name || short(s.from)}{" "}
          pays <strong>{formatAmount(s.amount)} XLM</strong> to{" "}
          {members.find((m) => m.address === s.to)?.name || short(s.to)}
        </div>
      ))}
    </div>
  );
};

export default SettlementsList;
