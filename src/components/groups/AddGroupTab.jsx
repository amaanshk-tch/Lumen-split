import React from "react";
import { Address } from "@stellar/stellar-sdk";
import { toString, toAddressVec } from "../../utils/sorobanUtils";
import { parseList } from "../../utils/helpers";

const AddGroupTab = ({
  groupName,
  setGroupName,
  groupMembersInput,
  setGroupMembersInput,
  publicKey,
  updateStatus,
  runWrite,
  isBusy,
}) => {
  const handleAddGroup = async () => {
    const name = groupName;
    if (!name.trim()) return updateStatus("Name required", "error");
    const membersInput = groupMembersInput;
    const members = parseList(membersInput).filter((a) => a !== publicKey);
    try {
      members.forEach((m) => new Address(m));
    } catch {
      return updateStatus("Invalid address", "error");
    }
    updateStatus("Creating...", "info");
    try {
      await runWrite(
        "create_group",
        [
          new Address(publicKey).toScVal(),
          toString(name),
          toAddressVec(members),
        ],
        "Group created",
      );
      setGroupName("");
      setGroupMembersInput("");
    } catch (e) {
      console.error("Group creation failed:", e);
    }
  };

  return (
    <div className="form-group">
      <h3>Add Group</h3>
      <input
        className="input"
        placeholder="Group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        autoComplete="off"
      />
      <input
        className="input"
        placeholder="Members (comma separates members)"
        value={groupMembersInput}
        onChange={(e) => setGroupMembersInput(e.target.value)}
        autoComplete="off"
      />
      <button className="button" onClick={handleAddGroup} disabled={isBusy}>
        Add Group
      </button>
    </div>
  );
};

export default AddGroupTab;
