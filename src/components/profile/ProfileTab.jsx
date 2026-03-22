import React from "react";

const ProfileTab = ({
  isCheckingReg,
  isRegistered,
  registeredName,
  publicKey,
  regInputName,
  setRegInputName,
  registerUser,
  isBusy,
}) => {
  return (
    <div className="form-group">
      <h3>User Profile</h3>
      {isCheckingReg ? (
        <p className="tab-hint" style={{ opacity: 0.7 }}>
          Loading profile data...
        </p>
      ) : isRegistered ? (
        <div className="info-card">
          <div className="label">Registered Name</div>
          <div className="value">{registeredName}</div>
          <div className="label" style={{ marginTop: "1rem" }}>
            Stellar Address
          </div>
          <div className="value" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            {publicKey}
          </div>
        </div>
      ) : (
        <>
          <p className="tab-hint">
            Register your account on the LumenSplit to get started.
          </p>
          <input
            className="input"
            placeholder="Display Name"
            value={regInputName}
            onChange={(e) => setRegInputName(e.target.value)}
            autoComplete="off"
          />
          <button className="button" onClick={registerUser} disabled={isBusy}>
            Register Profile
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileTab;
