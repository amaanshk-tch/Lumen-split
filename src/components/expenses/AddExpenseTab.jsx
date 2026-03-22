import React, { useMemo } from "react";
import { Address } from "@stellar/stellar-sdk";
import { toU32, toI128, toAddressVec } from "../../utils/sorobanUtils";
import GroupSelector from "../groups/GroupSelector";
import ParticipantSelector from "./ParticipantSelector";

const AddExpenseTab = ({
  selectedGroupId,
  setSelectedGroupId,
  loadGroup,
  groups,
  selectedGroup,
  billAmount,
  setBillAmount,
  payer,
  setPayer,
  participantSelections,
  setParticipantSelections,
  updateStatus,
  runWrite,
  isBusy,
}) => {
  const selectedParticipants = useMemo(
    () =>
      Object.keys(participantSelections).filter(
        (k) => participantSelections[k],
      ),
    [participantSelections],
  );

  const share = useMemo(() => {
    const total = Number(billAmount);
    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      selectedParticipants.length === 0
    )
      return 0;
    return total / selectedParticipants.length;
  }, [billAmount, selectedParticipants]);

  const handleAddExpense = async () => {
    if (!payer) return updateStatus("Payer required", "error");
    if (!billAmount || Number(billAmount) <= 0)
      return updateStatus("Invalid amount", "error");
    if (selectedParticipants.length === 0)
      return updateStatus("No participants", "error");
    await runWrite(
      "add_expense",
      [
        new Address(payer).toScVal(),
        toU32(selectedGroupId),
        toI128(billAmount),
        toAddressVec(selectedParticipants),
      ],
      "Expense added",
    );
    setBillAmount("");
  };

  return (
    <div className="form-group">
      <h3>Add Expense</h3>
      <p className="tab-hint">Split expenses with your group members.</p>
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        loadGroup={loadGroup}
      />
      {selectedGroup && (
        <>
          <input
            className="input"
            type="number"
            placeholder="Total amount (XLM)"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            autoComplete="off"
          />
          <select
            className="input"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            autoComplete="off"
          >
            <option value="" disabled hidden>
              Select member
            </option>
            {selectedGroup.members.map((m) => (
              <option key={m.address} value={m.address}>
                {m.name}
              </option>
            ))}
          </select>
          <ParticipantSelector
            members={selectedGroup.members}
            participantSelections={participantSelections}
            setParticipantSelections={setParticipantSelections}
          />
          <div
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "8px",
              marginTop: "0.5rem",
            }}
          >
            Per person share: <strong>{share.toFixed(2)} XLM</strong>
          </div>
          <button className="button" onClick={handleAddExpense} disabled={isBusy}>
            Add Expense
          </button>
        </>
      )}
    </div>
  );
};

export default AddExpenseTab;
