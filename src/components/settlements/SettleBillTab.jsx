import React from "react";
import { Address } from "@stellar/stellar-sdk";
import { toU32, toI128 } from "../../utils/sorobanUtils";
import GroupSelector from "../groups/GroupSelector";
import SettlementsList from "./SettlementsList";

const SettleBillTab = ({
  selectedGroupId,
  setSelectedGroupId,
  loadGroup,
  groups,
  selectedGroup,
  publicKey,
  settleTo,
  setSettleTo,
  settleAmount,
  setSettleAmount,
  updateStatus,
  runWrite,
  isBusy,
  settlements,
}) => {
  const handleSettleBill = async () => {
    if (!settleTo) return updateStatus("Recipient required", "error");
    if (!settleAmount || Number(settleAmount) <= 0)
      return updateStatus("Invalid amount", "error");
    await runWrite(
      "settle_debt",
      [
        new Address(publicKey).toScVal(),
        toU32(selectedGroupId),
        new Address(settleTo).toScVal(),
        toI128(settleAmount),
      ],
      "Bill settled",
    );
    setSettleAmount("");
  };

  return (
    <div className="form-group">
      <h3>Settle Bill</h3>
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        loadGroup={loadGroup}
      />
      {selectedGroup && (
        <>
          <select
            className="input"
            value={settleTo}
            onChange={(e) => setSettleTo(e.target.value)}
            autoComplete="off"
          >
            <option value="" disabled hidden>
              Select recipient
            </option>
            {selectedGroup.members
              .filter((m) => m.address !== publicKey)
              .map((m) => (
                <option key={m.address} value={m.address}>
                  {m.name}
                </option>
              ))}
          </select>
          <input
            className="input"
            type="number"
            placeholder="Amount (XLM)"
            value={settleAmount}
            onChange={(e) => setSettleAmount(e.target.value)}
            autoComplete="off"
          />
          <button className="button" onClick={handleSettleBill} disabled={isBusy}>
            Settle Bill
          </button>

          <SettlementsList
            settlements={settlements}
            members={selectedGroup.members}
          />
        </>
      )}
    </div>
  );
};

export default SettleBillTab;
