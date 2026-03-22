import React from "react";

const GroupSelector = ({ groups, selectedGroupId, setSelectedGroupId, loadGroup }) => {
  return (
    <select
      className="input select-custom"
      value={selectedGroupId}
      onChange={(e) => {
        setSelectedGroupId(e.target.value);
        loadGroup(e.target.value);
      }}
      autoComplete="off"
    >
      <option value="" disabled hidden>
        Select group
      </option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
};

export default GroupSelector;
