"use client";

import { useCallback, useEffect, useState } from "react";

export function useStoreDisplaySession() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const probe = useCallback(async () => {
    const res = await fetch("/api/store-display/feed", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      return false;
    }
    if (res.ok) {
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    const res = await fetch("/api/store-display/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setPinError(data.message || "PINが違います");
      return;
    }
    setAuthed(true);
    await probe();
  }

  return {
    authed,
    pin,
    setPin,
    pinError,
    submitPin,
    probe,
  };
}