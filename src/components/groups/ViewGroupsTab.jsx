import React from "react";
import { Address } from "@stellar/stellar-sdk";
import { toU32 } from "../../utils/sorobanUtils";
import GroupMembersList from "./GroupMembersList";
import ExpenseHistoryList from "./ExpenseHistoryList";
import GroupSelector from "./GroupSelector";

const ViewGroupsTab = ({
  selectedGroupId,
  setSelectedGroupId,
  loadGroup,
  groups,
  selectedGroup,
  publicKey,
  addMemberAddress,
  setAddMemberAddress,
  updateStatus,
  runWrite,
  isBusy,
  expenseHistory,
}) => {
  const handleAddMember = async () => {
    if (!addMemberAddress.trim()) return updateStatus("Address required", "error");
    try {
      new Address(addMemberAddress);
    } catch {
      return updateStatus("Invalid address", "error");
    }
    await runWrite(
      "add_member",
      [
        new Address(publicKey).toScVal(),
        toU32(selectedGroupId),
        new Address(addMemberAddress).toScVal(),
      ],
      "Member added",
    );
    setAddMemberAddress("");
  };

  const handleDeleteGroup = () => {
    runWrite(
      "delete_group",
      [new Address(publicKey).toScVal(), toU32(selectedGroupId)],
      "Group deleted",
    );
  };

  return (
    <div className="form-group">
      <h3>View Groups</h3>
      <GroupSelector
        groups={groups}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        loadGroup={loadGroup}
      />
      {selectedGroup && (
        <>
          <GroupMembersList
            members={selectedGroup.members}
            publicKey={publicKey}
          />
          <input
            className="input"
            placeholder="Add new members"
            value={addMemberAddress}
            onChange={(e) => setAddMemberAddress(e.target.value)}
            autoComplete="off"
          />
          <button className="button" onClick={handleAddMember} disabled={isBusy}>
            Add Member
          </button>
          {selectedGroup.creator === publicKey && (
            <button
              className="button secondary deletion-btn"
              onClick={handleDeleteGroup}
              disabled={isBusy}
            >
              Delete Group
            </button>
          )}
          <ExpenseHistoryList
            expenseHistory={expenseHistory}
            members={selectedGroup.members}
          />
        </>
      )}
    </div>
  );
};

export default ViewGroupsTab;
