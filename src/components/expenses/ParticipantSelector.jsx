import React from "react";

const ParticipantSelector = ({ members, participantSelections, setParticipantSelections }) => {
  return (
    <div style={{ width: "100%", textAlign: "left" }}>
      {members.map((m) => (
        <label
          key={m.address}
          style={{ display: "block", padding: "0.25rem 0" }}
        >
          <input
            type="checkbox"
            checked={!!participantSelections[m.address]}
            onChange={(e) =>
              setParticipantSelections((p) => ({
                ...p,
                [m.address]: e.target.checked,
              }))
            }
          />{" "}
          {m.name}
        </label>
      ))}
    </div>
  );
};

export default ParticipantSelector;
