import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress, isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";
import { Account, Address, BASE_FEE, Contract, Horizon, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr } from "stellar-sdk";
import "./App.css";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const NETWORK_LABEL = "TESTNET";
const CONTRACT_ID = "CBK7OZFRWQ35O6WDNRLF4QLIRJYLTG37FGL5XXC3OHQNZ742IF264ZNL";

const WALLET_TYPES = {
  FREIGHTER: "Freighter",
  ALBEDO: "Albedo"
};

const server = new Horizon.Server(HORIZON_URL);
const soroban = new rpc.Server("https://soroban-testnet.stellar.org");

const short = (addr) => (addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "");
const toU32 = (v) => nativeToScVal(Number(v), { type: "u32" });
const toI128 = (v) => nativeToScVal(BigInt(Math.floor(parseFloat(v || 0) * 1e7)), { type: "i128" });
const toString = (v) => nativeToScVal(v, { type: "string" });
const toAddressVec = (arr) => xdr.ScVal.scvVec(arr.map((a) => new Address(a).toScVal()));

const STROOPS_PER_XLM = 10000000n;
const formatAmount = (v) => (Number(v || 0) / 10000000).toFixed(2);

const ACTIVITY_TYPES = {
  1: "Expense",
  2: "Settlement",
  3: "MemberAdded"
};


const safeDecode = (val) => {
  try {
    if (typeof val === "string") return scValToNative(xdr.ScVal.fromXDR(val, "base64"));
    if (val && typeof val.switch === "function") return scValToNative(val);
    return val;
  } catch {
    return val;
  }
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [xlmBalance, setXlmBalance] = useState("0");
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [regInputName, setRegInputName] = useState("");
  const statusTimeout = useRef(null);
  const justRegistered = useRef(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [activities, setActivities] = useState([]);

  const [groupName, setGroupName] = useState("");
  const [groupMembersInput, setGroupMembersInput] = useState("");
  const [addMemberAddress, setAddMemberAddress] = useState("");

  const [billAmount, setBillAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [participantSelections, setParticipantSelections] = useState({});

  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  const clearState = () => {
    setXlmBalance("0");
    setIsRegistered(false);
    setRegisteredName("");
    setGroups([]);
    setSelectedGroupId("");
    setSelectedGroup(null);
    setSettlements([]);
    setExpenseHistory([]);
    setBillAmount("");
    setSettleAmount("");
    setAddMemberAddress("");
    setGroupName("");
    setGroupMembersInput("");
    setLastTxHash("");
  };

  const updateStatus = (msg, type = "") => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    setStatus(msg);
    setStatusType(type);
    if (type !== "info") {
      statusTimeout.current = setTimeout(() => setStatus(""), 5000);
    }
  };

  const callRead = useCallback(async (method, args = []) => {
    const contract = new Contract(CONTRACT_ID);
    const sim = await soroban.simulateTransaction(
      new TransactionBuilder(new Account(publicKey, "0"), { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build(),
    );
    if (!sim.result || sim.error || sim.result.error) return null;
    return safeDecode(sim.result.retval);
  }, [publicKey]);

  const checkRegistration = useCallback(async () => {
    if (!publicKey) return;
    try {
      const reg = await callRead("is_registered", [new Address(publicKey).toScVal()]);
      if (reg === true) {
        setIsRegistered(true);
        const name = await callRead("get_user_name", [new Address(publicKey).toScVal()]);
        if (name) setRegisteredName(name.toString());
        justRegistered.current = false; 
      } else if (reg === false) {
        if (justRegistered.current) return;
        setIsRegistered(false);
        setRegisteredName("");
      }
    } catch (e) {
      console.error("Registration check failed", e);
    }
  }, [callRead, publicKey]);

  const registerUser = async () => {
    if (!regInputName.trim()) return updateStatus("Failed", "error");
    const nameToRegister = regInputName;
    setIsBusy(true);
    
    try {
      await runWrite("register", [new Address(publicKey).toScVal(), toString(nameToRegister)], "Successful");
      setIsRegistered(true);
      setRegisteredName(nameToRegister);
      setRegInputName(""); 
      justRegistered.current = true;
      setTimeout(() => { justRegistered.current = false; }, 10000);
    } catch (e) {
      setIsRegistered(false);
      setRegisteredName("");
    } finally {
      setIsBusy(false);
    }
  };

  const normalizeGroup = useCallback((raw, id) => {
    const members = (raw?.members || []).map((m) => {
      const addr = m.address?.toString() || "";
      let name = m.name?.toString() || "Unknown";
      if (name === "Unknown") name = short(addr);
      return {
        address: addr,
        name,
        balance: Number(m.balance?.toString ? m.balance.toString() : m.balance || 0)
      };
    });
    return { 
      id: Number(id), 
      name: raw?.name?.toString() || String(raw?.name || ""), 
      members, 
      creator: raw?.creator?.toString() || "" 
    };
  }, []);

  const loadGroup = useCallback(async (groupId) => {
    if (!groupId) {
      setSelectedGroup(null);
      return;
    }
    const [g, settsRaw, expsRaw, actsRaw] = await Promise.all([
      callRead("get_group_with_balances", [toU32(groupId)]),
      callRead("get_settlements", [toU32(groupId)]),
      callRead("get_expenses", [toU32(groupId)]),
      callRead("get_activities", [toU32(groupId)])
    ]);

    if (!g) {
      setSelectedGroup(null);
      setSelectedGroupId("");
      return;
    }

    const normalized = normalizeGroup(g, groupId);
    setSelectedGroup(normalized);
    setPayer(normalized.members.find(m => m.address === publicKey)?.address || "");
    setSettleTo("");
    const checks = {};
    normalized.members.forEach((m) => { checks[m.address] = true; });
    setParticipantSelections(checks);
    setSettleTo(normalized.members.find((m) => m.address !== publicKey)?.address || "");
    
    const setts = settsRaw || [];
    setSettlements(setts.map((s) => ({
      from: s.from?.toString ? s.from.toString() : "",
      to: s.to?.toString ? s.to.toString() : "",
      amount: Number(s.amount?.toString ? s.amount.toString() : s.amount || 0),
    })));

    const exps = expsRaw || [];
    setExpenseHistory(exps.map(e => ({
      payer: e.payer?.toString ? e.payer.toString() : "",
      amount: Number(e.amount?.toString ? e.amount.toString() : e.amount || 0),
      timestamp: Number(e.timestamp?.toString ? e.timestamp.toString() : e.timestamp || 0),
      participants: (e.participants || []).map(p => p.toString())
    })).sort((a,b) => b.timestamp - a.timestamp));

    const acts = actsRaw || [];
    setActivities(acts.map(a => ({
      id: Number(a.id?.toString ? a.id.toString() : a.id || 0),
      kind: ACTIVITY_TYPES[Number(a.kind)] || (a.kind?.toString ? a.kind.toString() : a.kind),
      actor: a.actor?.toString ? a.actor.toString() : "",
      recipient: a.recipient?.toString ? a.recipient.toString() : "",
      amount: Number(a.amount?.toString ? a.amount.toString() : a.amount || 0),
      timestamp: Number(a.timestamp?.toString ? a.timestamp.toString() : a.timestamp || 0),
    })).sort((a,b) => b.id - a.id));

    setBillAmount("");
    setSettleAmount("");
    setAddMemberAddress("");
  }, [callRead, normalizeGroup, publicKey]);

  const refreshGroups = useCallback(async () => {
    if (!publicKey) return;
    const ids = (await callRead("get_groups_for_member", [new Address(publicKey).toScVal()])) || [];
    const parsed = ids.map((id) => Number(id?.toString ? id.toString() : id)).filter(Boolean);
    const groupsRaw = await Promise.all(parsed.map((gid) => callRead("get_group_with_balances", [toU32(gid)])));
    const out = groupsRaw.map((g, i) => normalizeGroup(g, parsed[i]));
    setGroups(out);
    
    if (selectedGroupId && !parsed.includes(Number(selectedGroupId))) {
      setSelectedGroupId("");
      setSelectedGroup(null);
    } else if (selectedGroupId) {
      await loadGroup(selectedGroupId);
    }
  }, [callRead, loadGroup, normalizeGroup, publicKey, selectedGroupId]);

  useEffect(() => {
    if (!connected || !publicKey) {
      clearState();
      return;
    }
    server.loadAccount(publicKey).then((acc) => {
      const native = acc.balances.find((b) => b.asset_type === "native");
      setXlmBalance(native ? Number(native.balance).toFixed(2) : "0.00");
    }).catch(() => setXlmBalance("0.00"));
    checkRegistration();
    refreshGroups();
  }, [connected, publicKey, refreshGroups, checkRegistration]);

  const disconnect = () => {
    setConnected(false);
    setPublicKey("");
    setSelectedWallet(null);
    clearState();
  };

  const signAndSubmit = async (buildFn) => {
    const account = await server.loadAccount(publicKey);
    const tx = buildFn(account).build();
    let signed;

    if (selectedWallet === WALLET_TYPES.FREIGHTER) {
      const prepared = await soroban.prepareTransaction(tx);
      const signedRaw = await signTransaction(prepared.toXDR(), { network: NETWORK_LABEL, networkPassphrase: NETWORK_PASSPHRASE });
      signed = typeof signedRaw === "string" ? signedRaw : signedRaw?.signedTxXdr || signedRaw?.signedTransaction || signedRaw?.transaction || signedRaw?.result;
    } else if (selectedWallet === WALLET_TYPES.ALBEDO) {
      const resp = await albedo.tx({ xdr: tx.toXDR(), network: NETWORK_LABEL.toLowerCase() });
      signed = resp.signed_envelope_xdr;
    }
    
    const finalTx = TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE);
    const result = await soroban.sendTransaction(finalTx);
    console.log("Tx Submitted. Status:", result.status, "Hash:", result.hash);
    
    if (result.status === "ERROR") {
      throw new Error(`Submission failed: ${JSON.stringify(result.errorResultXdr || result)}`);
    }

    let attempts = 0;
    while (attempts < 100) {
      let status = "PENDING";
      try {
        const rawResp = await fetch("https://soroban-testnet.stellar.org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "getTransaction",
            params: { hash: result.hash }
          })
        });
        const json = await rawResp.json();
        status = json?.result?.status || "PENDING";
      } catch (e) {
        try {
          const sdkResp = await soroban.getTransaction(result.hash);
          status = sdkResp.status;
        } catch {}
      }

      const upStatus = String(status || "PENDING").toUpperCase();
      if (upStatus === "SUCCESS") return result.hash;
      if (upStatus === "FAILED") throw new Error("Transaction failed on-chain");
      
      await new Promise(resolve => setTimeout(resolve, 150));
      attempts++;
    }
    throw new Error("Confirmation timeout (check history)");
  };

  const runWrite = async (method, args, okMsg) => {
    setIsBusy(true);
    setLastTxHash("");
    updateStatus("Submitting...", "info");
    try {
      const contract = new Contract(CONTRACT_ID);
      const hash = await signAndSubmit((account) => new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30));
      updateStatus("Successful", "success");
      setLastTxHash(hash);
      console.log("Tx Hash:", hash);
      setIsBusy(false);
      refreshGroups().catch((ee) => console.error("BG Refresh failed:", ee));
    } catch (e) {
      console.error(e);
      updateStatus("Failed", "error");
      setIsBusy(false);
      throw e;
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setBillAmount("");
    setSettleAmount("");
    setAddMemberAddress("");
    if (connected && publicKey) {
      refreshGroups();
      checkRegistration();
    }
  };

  const parseList = (value) => [...new Set(value.split(/[\s,]+/).map((v) => v.trim()).filter((v) => v.startsWith("G")))];
  const selectedParticipants = useMemo(() => Object.keys(participantSelections).filter((k) => participantSelections[k]), [participantSelections]);
  const share = useMemo(() => {
    const total = Number(billAmount);
    if (!Number.isFinite(total) || total <= 0 || selectedParticipants.length === 0) return 0;
    return total / selectedParticipants.length;
  }, [billAmount, selectedParticipants]);

  const connectWithWallet = async (walletType) => {
    try {
      let pubkey = "";
      if (walletType === WALLET_TYPES.FREIGHTER) {
        if (!(await isConnected())) {
          updateStatus("Freighter not found", "error");
          return;
        }
        await requestAccess();
        const addr = await getAddress();
        pubkey = addr?.address;
      } else if (walletType === WALLET_TYPES.ALBEDO) {
        const resp = await albedo.publicKey({});
        pubkey = resp.pubkey;
      }

      if (!pubkey) return;

      setPublicKey(pubkey);
      setSelectedWallet(walletType);
      setConnected(true);
      setActiveTab("profile");
      setShowWalletModal(false);
    } catch (e) {
      console.error("Connection failed", e);
      updateStatus("Connection failed", "error");
    }
  };

  const connectWallet = () => {
    setShowWalletModal(true);
  };

  return (
    <div className="app">
      <div className="background-glow" />
      <div className={"card " + (connected ? "compact" : "boxed")}>
        <div className="card-header">
          {status && (
            <div className={`status ${statusType}`}>
              <span className="status-text">{status}</span>
              <button className="status-close" onClick={() => setStatus("")}>×</button>
            </div>
          )}
          <h1 className="title">LumenSplit</h1>
        </div>
        {!connected ? (
          <>
            <button className="button connect-main-btn" onClick={connectWallet}>Connect Wallet</button>
            <div className="footer">Split bills not friendships.</div>

            {showWalletModal && (
              <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
                <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="wallet-modal-header">
                    <span className="wallet-modal-title">Connect Wallet</span>
                    <button className="wallet-modal-close" onClick={() => setShowWalletModal(false)}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                  <div className="wallet-options">
                    <button className="wallet-option" onClick={() => connectWithWallet(WALLET_TYPES.FREIGHTER)}>
                      <span className="wallet-option-name">Freighter</span>
                      <span className="wallet-option-tag">Extension</span>
                    </button>
                    <button className="wallet-option" onClick={() => connectWithWallet(WALLET_TYPES.ALBEDO)}>
                      <span className="wallet-option-name">Albedo</span>
                      <span className="wallet-option-tag web">Web</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="wallet-header-row">
              <div className="wallet-info-block">
                <div className="wallet-label-row">
                  <span className="wallet-badge">{selectedWallet}</span>
                  <span className="wallet-badge success">Member</span>
                </div>
                <div className="address-line">{short(publicKey)}</div>
                <div className="balance-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                  <div className="balance-item">
                    <div className="balance-label">Native XLM</div>
                    <div className="xlm-balance"><strong>{xlmBalance}</strong></div>
                  </div>
                  <div className="balance-item">
                    <div className="balance-label">Groups</div>
                    <div className="contract-balance"><strong>{groups.length}</strong></div>
                  </div>
                </div>
                {isRegistered ? (
                  <div className="profile-badge">
                    <span className="name-tag">{registeredName}</span>
                  </div>
                ) : (
                  <div className="warning-pill">Profile not registered</div>
                )}
              </div>
              <button className="disconnect-link" onClick={disconnect}>Disconnect</button>
            </div>

            <div className="tabs">
              {["profile", "dashboard", "add-group", "view-groups", "add-expense", "settle-bill", "activity"].map((t) => (
                <button key={t} className={activeTab === t ? "active" : ""} onClick={() => handleTabChange(t)}>
                  {t.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))}
            </div>

            <div className="tab-content">
              <div className="transition-fade">
                {activeTab === "profile" && (
                  <div className="form-group">
                    <h3>User Profile</h3>
                    {isRegistered ? (
                      <div className="info-card">
                        <div className="label">Registered Name</div>
                        <div className="value">{registeredName}</div>
                        <div className="label" style={{ marginTop: "1rem" }}>Stellar Address</div>
                        <div className="value" style={{ fontSize: "0.75rem", opacity: 0.7 }}>{publicKey}</div>
                      </div>
                    ) : (
                      <>
                        <p className="tab-hint">Register your name on the Stellar ledger to get started.</p>
                        <input className="input" placeholder="Display Name (e.g. John Doe)" value={regInputName} onChange={(e) => setRegInputName(e.target.value)} autoComplete="off" />
                        <button className="button" onClick={registerUser} disabled={isBusy}>Register Profile</button>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "dashboard" && (
                  <div className="form-group">
                    <h3>Wallet Dashboard</h3>
                    <p className="tab-hint">View your active group balances.</p>
                    <select className="input select-custom" value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); loadGroup(e.target.value); }} autoComplete="off">
                      <option value="" disabled hidden>Select group</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {selectedGroup && (
                      <div style={{ width: "100%", marginTop: "1rem" }}>
                        {selectedGroup.members.map((m) => (
                          <div key={m.address} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", background: m.address === publicKey ? "rgba(255,255,255,0.05)" : "transparent" }}>
                            <span>{m.address === publicKey ? "You (" + m.name + ")" : m.name}</span>
                            <strong>{formatAmount(m.balance)} XLM</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="button secondary" onClick={refreshGroups} disabled={isBusy} style={{ marginTop: "1rem" }}>Refresh</button>
                  </div>
                )}

                {activeTab === "add-group" && (
                  <div className="form-group">
                    <h3>Add Group</h3>
                    <input className="input" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} autoComplete="off" />
                    <input className="input" placeholder="Members (comma separated G...)" value={groupMembersInput} onChange={(e) => setGroupMembersInput(e.target.value)} autoComplete="off" />
                    <button className="button" onClick={async () => {
                      const name = groupName;
                      if (!name.trim()) return updateStatus("Please enter a group name", "error");
                      const membersInput = groupMembersInput;
                      const members = parseList(membersInput).filter((a) => a !== publicKey);
                      try { members.forEach(m => new Address(m)); } catch { return updateStatus("Invalid member address provided", "error"); }
                      updateStatus("Creating group...", "info");
                      try {
                        await runWrite("create_group", [new Address(publicKey).toScVal(), toString(name), toAddressVec(members)], "Group created");
                        setGroupName("");
                        setGroupMembersInput("");
                      } catch (e) {
                        console.error("Group creation failed:", e);
                      }
                    }} disabled={isBusy}>Add Group</button>
                  </div>
                )}

                {activeTab === "view-groups" && (
                  <div className="form-group">
                    <h3>View Groups</h3>
                    <select className="input select-custom" value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); loadGroup(e.target.value); }} autoComplete="off">
                      <option value="" disabled hidden>Select group</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {selectedGroup && (
                      <>
                        <div style={{ width: "100%" }}>
                          {selectedGroup.members.map((m) => (
                            <div key={m.address} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0" }}>
                              <span>{m.address === publicKey ? "You (" + m.name + ")" : m.name}</span>
                              <strong>{formatAmount(m.balance)} XLM</strong>
                            </div>
                          ))}
                        </div>
                        <input className="input" placeholder="New member G..." value={addMemberAddress} onChange={(e) => setAddMemberAddress(e.target.value)} autoComplete="off" />
                        <button className="button" onClick={async () => {
                          if (!addMemberAddress.trim()) return updateStatus("Please enter a member address", "error");
                          try { new Address(addMemberAddress); } catch { return updateStatus("Invalid member address", "error"); }
                          await runWrite("add_member", [new Address(publicKey).toScVal(), toU32(selectedGroupId), new Address(addMemberAddress).toScVal()], "Member added");
                          setAddMemberAddress("");
                        }} disabled={isBusy}>Add Member</button>
                        {selectedGroup.creator === publicKey && (
                          <button className="button secondary deletion-btn" onClick={() => runWrite("delete_group", [new Address(publicKey).toScVal(), toU32(selectedGroupId)], "Group deleted")} disabled={isBusy}>Delete Group</button>
                        )}
                        <div style={{ marginTop: "1rem", width: "100%", textAlign: "left" }}>
                          <h4>Expense History</h4>
                          {expenseHistory.length === 0 && <p className="tab-hint">No expenses yet.</p>}
                          {expenseHistory.map((e, i) => (
                            <div key={i} style={{ padding: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.9rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span><strong>{selectedGroup.members.find(m => m.address === e.payer)?.name || short(e.payer)}</strong> paid</span>
                                <strong>{formatAmount(e.amount)} XLM</strong>
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                {new Date(e.timestamp * 1000).toLocaleString()} • {e.participants.length} participants
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "add-expense" && (
                  <div className="form-group">
                    <h3>Add Expense</h3>
                    <p className="tab-hint">Split expenses with your group members.</p>
                    <select className="input select-custom" value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); loadGroup(e.target.value); }} autoComplete="off">
                      <option value="" disabled hidden>Select group</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {selectedGroup && (
                      <>
                        <input className="input" type="number" placeholder="Total amount (XLM)" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} autoComplete="off" />
                        <select className="input" value={payer} onChange={(e) => setPayer(e.target.value)} autoComplete="off">
                          <option value="" disabled hidden>Select member</option>
                          {selectedGroup.members.map((m) => <option key={m.address} value={m.address}>{m.name}</option>)}
                        </select>
                        <div style={{ width: "100%", textAlign: "left" }}>
                          {selectedGroup.members.map((m) => (
                            <label key={m.address} style={{ display: "block", padding: "0.25rem 0" }}>
                              <input type="checkbox" checked={!!participantSelections[m.address]} onChange={(e) => setParticipantSelections((p) => ({ ...p, [m.address]: e.target.checked }))} /> {m.name}
                            </label>
                          ))}
                        </div>
                        <div style={{ width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginTop: "0.5rem" }}>
                          Per person share: <strong>{share.toFixed(2)} XLM</strong>
                        </div>
                        <button className="button" onClick={async () => {
                          if (!payer) return updateStatus("Please select a payer", "error");
                          if (!billAmount || Number(billAmount) <= 0) return updateStatus("Please enter a valid amount", "error");
                          if (selectedParticipants.length === 0) return updateStatus("Please select at least one participant", "error");
                          await runWrite("add_expense", [new Address(payer).toScVal(), toU32(selectedGroupId), toI128(billAmount), toAddressVec(selectedParticipants)], "Expense added");
                          setBillAmount("");
                        }} disabled={isBusy}>Add Expense</button>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "settle-bill" && (
                  <div className="form-group">
                    <h3>Settle Bill</h3>
                    <select className="input select-custom" value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); loadGroup(e.target.value); }} autoComplete="off">
                      <option value="" disabled hidden>Select group</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {selectedGroup && (
                      <>
                        <select className="input" value={settleTo} onChange={(e) => setSettleTo(e.target.value)} autoComplete="off">
                          <option value="" disabled hidden>Select recipient</option>
                          {selectedGroup.members.filter((m) => m.address !== publicKey).map((m) => <option key={m.address} value={m.address}>{m.name}</option>)}
                        </select>
                        <input className="input" type="number" placeholder="Amount (XLM)" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} autoComplete="off" />
                        <button className="button" onClick={async () => {
                          if (!settleTo) return updateStatus("Please select a recipient account", "error");
                          if (!settleAmount || Number(settleAmount) <= 0) return updateStatus("Please enter a valid amount", "error");
                          await runWrite("settle_debt", [new Address(publicKey).toScVal(), toU32(selectedGroupId), new Address(settleTo).toScVal(), toI128(settleAmount)], "Bill settled");
                          setSettleAmount("");
                        }} disabled={isBusy}>Settle Bill</button>
                        {settlements.length > 0 && (
                          <div style={{ width: "100%", marginTop: "1rem", padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "left" }}>
                            <h4>Settlements</h4>
                            {settlements.map((s, i) => (
                              <div key={i} style={{ padding: "0.35rem 0", borderBottom: i < settlements.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                {selectedGroup.members.find(m => m.address === s.from)?.name || short(s.from)} pays <strong>{formatAmount(s.amount)} XLM</strong> to {selectedGroup.members.find(m => m.address === s.to)?.name || short(s.to)}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="form-group">
                    <h3>Group Activity</h3>
                    <p className="tab-hint">Recent actions within the group.</p>
                    <select className="input select-custom" value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); loadGroup(e.target.value); }} autoComplete="off">
                      <option value="" disabled hidden>Select group</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {selectedGroup && (
                      <div style={{ marginTop: "1rem", width: "100%", textAlign: "left" }}>
                        {activities.length === 0 && <p className="tab-hint">No activity yet.</p>}
                        {activities.map((a) => (
                          <div key={a.id} style={{ padding: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.9rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                              <span style={{ color: "var(--accent-glow)", fontWeight: "bold" }}>#{a.id} {a.kind}</span>
                              <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>{new Date(a.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <div style={{ opacity: 0.9 }}>
                              <strong>{selectedGroup.members.find(m => m.address === a.actor)?.name || short(a.actor)}</strong> 
                              {a.kind === "Expense" && ` added an expense of ${formatAmount(a.amount)} XLM`}
                              {a.kind === "Settlement" && ` paid ${formatAmount(a.amount)} XLM to ${selectedGroup.members.find(m => m.address === a.recipient)?.name || short(a.recipient)}`}
                              {a.kind === "MemberAdded" && (a.amount === 0 ? ` created the group` : ` added ${selectedGroup.members.find(m => m.address === a.recipient)?.name || short(a.recipient)}`)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {lastTxHash && (
              <div style={{ marginTop: "1.5rem", padding: "0.75rem", background: "rgba(46, 204, 113, 0.1)", border: "1px solid rgba(46, 204, 113, 0.3)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#2ecc71" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "left", wordBreak: "break-all", paddingRight: "1rem" }}>
                  <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Transaction Successful</span>
                  <span style={{ fontSize: "0.8rem", opacity: 0.8, fontFamily: "monospace" }}>Hash: <span style={{ userSelect: "all" }}>{lastTxHash}</span></span>
                </div>
                <button style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: "0.25rem", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }} onClick={() => {
                  navigator.clipboard.writeText(lastTxHash);
                  updateStatus("Hash copied to clipboard!", "success");
                }} title="Copy Hash" onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
