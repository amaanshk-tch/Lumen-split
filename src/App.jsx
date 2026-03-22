
import React, { useEffect, useState, useCallback } from "react";
import { Address, TransactionBuilder, BASE_FEE, Contract } from "@stellar/stellar-sdk";
import "./App.css";

// Utils
import { CONTRACT_ID, NETWORK_PASSPHRASE } from "./utils/constants";

// Hooks
import { useStatus } from "./hooks/useStatus";
import { useWallet } from "./hooks/useWallet";
import { useRegistration } from "./hooks/useRegistration";
import { useGroups } from "./hooks/useGroups";

// Services
import { signAndSubmit } from "./services/contractService";

// Components
import StatusBanner from "./components/common/StatusBanner";
import TabNavigation from "./components/common/TabNavigation";
import SuccessTransactionBanner from "./components/common/SuccessTransactionBanner";
import { ConnectWalletScreen, WalletHeader, WalletModal } from "./components/wallet/WalletComponents";
import ProfileTab from "./components/profile/ProfileTab";
import DashboardTab from "./components/dashboard/DashboardTab";
import AddGroupTab from "./components/groups/AddGroupTab";
import ViewGroupsTab from "./components/groups/ViewGroupsTab";
import AddExpenseTab from "./components/expenses/AddExpenseTab";
import SettleBillTab from "./components/settlements/SettleBillTab";
import ActivityTab from "./components/activity/ActivityTab";

export default function App() {
  const { status, statusType, updateStatus, setStatus } = useStatus();
  const {
    connected,
    publicKey,
    xlmBalance,
    selectedWallet,
    showWalletModal,
    setShowWalletModal,
    connectWithWallet,
    disconnect,
    fetchBalance,
  } = useWallet(updateStatus);

  const {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    setSelectedGroup,
    settlements,
    expenseHistory,
    activities,
    loadGroup,
    refreshGroups,
  } = useGroups(publicKey);

  const [activeTab, setActiveTab] = useState("profile");
  const [isBusy, setIsBusy] = useState(false);
  const [lastTxHash, setLastTxHash] = useState("");
  const [lastTxTab, setLastTxTab] = useState("");
  const [recentTransactions, setRecentTransactions] = useState([]);

  const runWrite = useCallback(async (method, args, okMsg) => {
    setIsBusy(true);
    setLastTxHash("");
    updateStatus("Submitting...", "info");
    try {
      const contract = new Contract(CONTRACT_ID);
      const hash = await signAndSubmit(publicKey, selectedWallet, (account) =>
        new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call(method, ...args))
          .setTimeout(30),
      );
      updateStatus("Successful", "success");
      setLastTxHash(hash);
      setLastTxTab(activeTab);
      setRecentTransactions((prev) => [
        { hash, action: okMsg || "Transaction", timestamp: Date.now() },
        ...prev,
      ]);
      setIsBusy(false);
      refreshGroups();
    } catch (e) {
      console.error(e);
      updateStatus("Tx Failed", "error");
      setIsBusy(false);
      throw e;
    }
  }, [publicKey, selectedWallet, updateStatus, activeTab, refreshGroups]);

  const {
    isRegistered,
    isCheckingReg,
    registeredName,
    regInputName,
    setRegInputName,
    checkRegistration,
    registerUser,
    setIsRegistered,
    setRegisteredName
  } = useRegistration(publicKey, updateStatus, runWrite);

  // Tab specific states
  const [groupName, setGroupName] = useState("");
  const [groupMembersInput, setGroupMembersInput] = useState("");
  const [addMemberAddress, setAddMemberAddress] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [participantSelections, setParticipantSelections] = useState({});
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const clearState = useCallback(() => {
    setIsRegistered(false);
    setRegisteredName("");
    setRegInputName("");
    setSelectedGroupId("");
    setSelectedGroup(null);
    setBillAmount("");
    setSettleAmount("");
    setAddMemberAddress("");
    setGroupName("");
    setGroupMembersInput("");
    setLastTxHash("");
    setLastTxTab("");
    setRecentTransactions([]);
    setActiveTab("profile");
  }, [setIsRegistered, setRegisteredName, setRegInputName, setSelectedGroupId, setSelectedGroup, setActiveTab]);

  useEffect(() => {
    if (!connected || !publicKey) {
      clearState();
      return;
    }
    fetchBalance(publicKey);
    checkRegistration();
    refreshGroups();
  }, [connected, publicKey, checkRegistration, refreshGroups, fetchBalance, clearState]);

  const handleDisconnect = () => {
    disconnect();
    clearState();
  };

  const handleTabChange = (tab) => {
    if (tab !== "profile" && !isRegistered) {
      updateStatus("Please register your profile first", "error");
      return;
    }
    setActiveTab(tab);
    setBillAmount("");
    setSettleAmount("");
    setAddMemberAddress("");
    setRegInputName("");
    setGroupName("");
    setGroupMembersInput("");
    setLastTxHash("");
    if (connected && publicKey) {
      refreshGroups();
      checkRegistration();
    }
  };

  const connectWallet = () => setShowWalletModal(true);

  useEffect(() => {
    if (selectedGroup) {
      setPayer(selectedGroup.members.find((m) => m.address === publicKey)?.address || "");
      const checks = {};
      selectedGroup.members.forEach((m) => {
        checks[m.address] = true;
      });
      setParticipantSelections(checks);
      setSettleTo(selectedGroup.members.find((m) => m.address !== publicKey)?.address || "");
    }
  }, [selectedGroup, publicKey]);

  return (
    <div className="app">
      <StatusBanner status={status} statusType={statusType} setStatus={setStatus} />
      <div className="background-glow" />
      <div className={"card " + (connected ? "compact" : "boxed")}>
        <div className="card-header">
          <h1 className="title">LumenSplit</h1>
        </div>
        {!connected ? (
          <>
            <ConnectWalletScreen connectWallet={connectWallet} />
            {showWalletModal && (
              <WalletModal
                setShowWalletModal={setShowWalletModal}
                connectWithWallet={connectWithWallet}
              />
            )}
          </>
        ) : (
          <>
            <WalletHeader
              selectedWallet={selectedWallet}
              publicKey={publicKey}
              xlmBalance={xlmBalance}
              groupsCount={groups.length}
              isRegistered={isRegistered}
              registeredName={registeredName}
              isCheckingReg={isCheckingReg}
              disconnect={handleDisconnect}
            />

            <TabNavigation
              activeTab={activeTab}
              handleTabChange={handleTabChange}
              isRegistered={isRegistered}
            />

            <div className="tab-content">
              <div className="transition-fade">
                {activeTab === "profile" && (
                  <ProfileTab
                    isCheckingReg={isCheckingReg}
                    isRegistered={isRegistered}
                    registeredName={registeredName}
                    publicKey={publicKey}
                    regInputName={regInputName}
                    setRegInputName={setRegInputName}
                    registerUser={registerUser}
                    isBusy={isBusy}
                  />
                )}

                {activeTab === "dashboard" && (
                  <DashboardTab
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    loadGroup={loadGroup}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    publicKey={publicKey}
                    refreshGroups={refreshGroups}
                    isBusy={isBusy}
                  />
                )}

                {activeTab === "add-group" && (
                  <AddGroupTab
                    groupName={groupName}
                    setGroupName={setGroupName}
                    groupMembersInput={groupMembersInput}
                    setGroupMembersInput={setGroupMembersInput}
                    publicKey={publicKey}
                    updateStatus={updateStatus}
                    runWrite={runWrite}
                    isBusy={isBusy}
                  />
                )}

                {activeTab === "view-groups" && (
                  <ViewGroupsTab
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    loadGroup={loadGroup}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    publicKey={publicKey}
                    addMemberAddress={addMemberAddress}
                    setAddMemberAddress={setAddMemberAddress}
                    updateStatus={updateStatus}
                    runWrite={runWrite}
                    isBusy={isBusy}
                    expenseHistory={expenseHistory}
                  />
                )}

                {activeTab === "add-expense" && (
                  <AddExpenseTab
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    loadGroup={loadGroup}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    publicKey={publicKey}
                    billAmount={billAmount}
                    setBillAmount={setBillAmount}
                    payer={payer}
                    setPayer={setPayer}
                    participantSelections={participantSelections}
                    setParticipantSelections={setParticipantSelections}
                    updateStatus={updateStatus}
                    runWrite={runWrite}
                    isBusy={isBusy}
                  />
                )}

                {activeTab === "settle-bill" && (
                  <SettleBillTab
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    loadGroup={loadGroup}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    publicKey={publicKey}
                    settleTo={settleTo}
                    setSettleTo={setSettleTo}
                    settleAmount={settleAmount}
                    setSettleAmount={setSettleAmount}
                    updateStatus={updateStatus}
                    runWrite={runWrite}
                    isBusy={isBusy}
                    settlements={settlements}
                  />
                )}

                {activeTab === "activity" && (
                  <ActivityTab
                    recentTransactions={recentTransactions}
                    updateStatus={updateStatus}
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    loadGroup={loadGroup}
                    groups={groups}
                    selectedGroup={selectedGroup}
                    activities={activities}
                  />
                )}
              </div>
            </div>

            <SuccessTransactionBanner
              lastTxHash={lastTxHash}
              activeTab={activeTab}
              lastTxTab={lastTxTab}
              updateStatus={updateStatus}
            />
          </>
        )}
      </div>
    </div>
  );
}
