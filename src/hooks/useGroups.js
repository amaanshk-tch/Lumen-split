import { useState, useCallback } from "react";
import { Address } from "@stellar/stellar-sdk";
import { callRead } from "../services/contractService";
import { toU32 } from "../utils/sorobanUtils";
import { short as s } from "../utils/helpers";
import { ACTIVITY_TYPES as AT } from "../utils/constants";

export const useGroups = (publicKey) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [activities, setActivities] = useState([]);

  const normalizeGroup = useCallback((raw, id) => {
    const members = (raw?.members || []).map((m) => {
      const addr = m.address?.toString() || "";
      let name = m.name?.toString() || "Unknown";
      if (name === "Unknown") name = s(addr);
      return {
        address: addr,
        name,
        balance: Number(
          m.balance?.toString ? m.balance.toString() : m.balance || 0,
        ),
      };
    });
    return {
      id: Number(id),
      name: raw?.name?.toString() || String(raw?.name || ""),
      members,
      creator: raw?.creator?.toString() || "",
    };
  }, []);

  const loadGroup = useCallback(
    async (groupId) => {
      if (!groupId || !publicKey) {
        setSelectedGroup(null);
        return;
      }
      const [g, settsRaw, expsRaw, actsRaw] = await Promise.all([
        callRead(publicKey, "get_group_with_balances", [toU32(groupId)]),
        callRead(publicKey, "get_settlements", [toU32(groupId)]),
        callRead(publicKey, "get_expenses", [toU32(groupId)]),
        callRead(publicKey, "get_activities", [toU32(groupId)]),
      ]);

      if (!g) {
        setSelectedGroup(null);
        setSelectedGroupId("");
        return;
      }

      const normalized = normalizeGroup(g, groupId);
      setSelectedGroup(normalized);

      const setts = settsRaw || [];
      setSettlements(
        setts.map((s) => ({
          from: s.from?.toString ? s.from.toString() : "",
          to: s.to?.toString ? s.to.toString() : "",
          amount: Number(
            s.amount?.toString ? s.amount.toString() : s.amount || 0,
          ),
        })),
      );

      const exps = expsRaw || [];
      setExpenseHistory(
        exps
          .map((e) => ({
            payer: e.payer?.toString ? e.payer.toString() : "",
            amount: Number(
              e.amount?.toString ? e.amount.toString() : e.amount || 0,
            ),
            timestamp: Number(
              e.timestamp?.toString ? e.timestamp.toString() : e.timestamp || 0,
            ),
            participants: (e.participants || []).map((p) => p.toString()),
          }))
          .sort((a, b) => b.timestamp - a.timestamp),
      );

      const acts = actsRaw || [];
      setActivities(
        acts
          .map((a) => ({
            id: Number(a.id?.toString ? a.id.toString() : a.id || 0),
            kind:
              AT[a.kind?.toString ? a.kind.toString() : a.kind] ||
              AT[Number(a.kind)] ||
              (a.kind?.toString ? a.kind.toString() : "Activity"),
            actor: a.actor?.toString ? a.actor.toString() : "",
            recipient: Array.isArray(a.recipient) 
              ? (a.recipient[0]?.toString ? a.recipient[0].toString() : "")
              : (a.recipient?.toString ? a.recipient.toString() : ""),
            amount: Number(
              a.amount?.toString ? a.amount.toString() : a.amount || 0,
            ),
            timestamp: Number(
              a.timestamp?.toString ? a.timestamp.toString() : a.timestamp || 0,
            ),
          }))
          .sort((a, b) => b.id - a.id),
      );
    },
    [normalizeGroup, publicKey],
  );

  const refreshGroups = useCallback(async () => {
    if (!publicKey) return;
    const ids =
      (await callRead(publicKey, "get_groups_for_member", [
        new Address(publicKey).toScVal(),
      ])) || [];
    const parsed = ids
      .map((id) => Number(id?.toString ? id.toString() : id))
      .filter(Boolean);
    const groupsRaw = await Promise.all(
      parsed.map((gid) => callRead(publicKey, "get_group_with_balances", [toU32(gid)])),
    );
    const out = groupsRaw.map((g, i) => normalizeGroup(g, parsed[i]));
    setGroups(out);

    if (selectedGroupId && !parsed.includes(Number(selectedGroupId))) {
      setSelectedGroupId("");
      setSelectedGroup(null);
    } else if (selectedGroupId) {
      await loadGroup(selectedGroupId);
    }
  }, [loadGroup, normalizeGroup, publicKey, selectedGroupId]);

  return {
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
    normalizeGroup,
  };
};
