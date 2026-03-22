import { useState, useCallback, useRef } from "react";
import { Address } from "@stellar/stellar-sdk";
import { callRead } from "../services/contractService";
import { toString } from "../utils/sorobanUtils";

export const useRegistration = (publicKey, updateStatus, runWrite) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingReg, setIsCheckingReg] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [regInputName, setRegInputName] = useState("");
  const justRegistered = useRef(false);

  const checkRegistration = useCallback(async () => {
    if (!publicKey) return;
    
    const cachedName = localStorage.getItem("lumenProfile_" + publicKey);
    if (cachedName) {
      setIsRegistered(true);
      setRegisteredName(cachedName);
    } else {
      setIsCheckingReg(true);
    }

    try {
      const reg = await callRead(publicKey, "is_registered", [
        new Address(publicKey).toScVal(),
      ]);
      if (reg === true) {
        setIsRegistered(true);
        const name = await callRead(publicKey, "get_user_name", [
          new Address(publicKey).toScVal(),
        ]);
        if (name) {
          const nameStr = name.toString();
          setRegisteredName(nameStr);
          localStorage.setItem("lumenProfile_" + publicKey, nameStr);
        }
        justRegistered.current = false;
      } else if (reg === false) {
        if (justRegistered.current) return;
        setIsRegistered(false);
        setRegisteredName("");
        localStorage.removeItem("lumenProfile_" + publicKey);
      }
    } catch (e) {
      console.error("Registration check failed", e);
    } finally {
      setIsCheckingReg(false);
    }
  }, [publicKey]);

  const registerUser = async () => {
    if (!regInputName.trim()) return updateStatus("Name required", "error");
    const nameToRegister = regInputName;

    try {
      await runWrite(
        "register",
        [new Address(publicKey).toScVal(), toString(nameToRegister)],
        "Successful",
      );
      setIsRegistered(true);
      setRegisteredName(nameToRegister);
      setRegInputName("");
      justRegistered.current = true;
      setTimeout(() => {
        justRegistered.current = false;
      }, 10000);
    } catch {
      setIsRegistered(false);
      setRegisteredName("");
    }
  };

  return {
    isRegistered,
    isCheckingReg,
    registeredName,
    regInputName,
    setRegInputName,
    setRegisteredName,
    setIsRegistered,
    checkRegistration,
    registerUser,
  };
};
