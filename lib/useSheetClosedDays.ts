"use client";

import { useEffect, useState } from "react";
import { toSheetClosedDates, type SheetClosedDates } from "./sheetClosedDays";

export function useSheetClosedDays() {
  const [closedDates, setClosedDates] = useState<SheetClosedDates>(
    () => new Set(),
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/booking/closed-days", {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          ok?: boolean;
          closedDays?: unknown;
        };

        if (cancelled) return;

        if (json.ok) {
          setClosedDates(toSheetClosedDates(json.closedDays));
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { closedDates, loaded, error };
}
