import { useState, useRef, useCallback } from "react";

export const useStatus = () => {
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const statusTimeout = useRef(null);

  const updateStatus = useCallback((msg, type = "") => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    setStatus(msg);
    setStatusType(type);
    if (type !== "info") {
      statusTimeout.current = setTimeout(() => setStatus(""), 3000);
    }
  }, []);

  const clearStatus = useCallback(() => {
    if (statusTimeout.current) clearTimeout(statusTimeout.current);
    setStatus("");
    setStatusType("");
  }, []);

  return { status, statusType, updateStatus, setStatus, clearStatus };
};
