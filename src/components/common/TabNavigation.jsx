import React from "react";

const TabNavigation = ({ activeTab, handleTabChange, isRegistered }) => {
  const tabs = [
    "profile",
    "dashboard",
    "add-group",
    "view-groups",
    "add-expense",
    "settle-bill",
    "activity",
  ];

  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t}
          className={activeTab === t ? "active" : ""}
          onClick={() => handleTabChange(t)}
          style={!isRegistered && t !== "profile" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          {t
            .split("-")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
