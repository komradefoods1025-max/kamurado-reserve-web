"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreDisplayOrder } from "../../lib/storeDisplayQueue";
import {
  orderMatchesStoreTable,
  STORE_ORDER_TABLE_COUNT,
  storeTableLabel,
} from "../../lib/storeOrderTables";
import StoreDisplayOrderCard from "./StoreDisplayOrderCard";
import styles from "./display.module.css";

type BoardMode = "kitchen" | "counter";

const COUNTER_VISIBLE: StoreDisplayOrder["status"][] = [
  "完成",
  "提供済み",
  "受付済み",
  "調理中",
];

/** 店舗表示 UI 世代（キャッシュ確認用・ヘッダーに表示） */
const DISPLAY_UI_REV = "quad-2x2";

export default function StoreDisplayBoard({
  mode,
  title,
  tableId = null,
}: {
  mode: BoardMode;
  title: string;
  /** 指定時のみその卓に絞る（通常は未使用） */
  tableId?: string | null;
}) {
  const showTableQuad =
    (mode === "kitchen" || mode === "counter") && !tableId;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [orders, setOrders] = useState<StoreDisplayOrder[]>([]);
  const [queueWarning, setQueueWarning] = useState<string | null>(null);
  const [clock, setClock] = useState("");
  const seenRef = useRef<Set<string>>(new Set());
  const bootRef = useRef(true);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const playNewOrderSound = useCallback(() => {
    try {
      const audio = new Audio(
        mode === "kitchen"
          ? "/sounds/go-to-datetime.wav?v=3"
          : "/sounds/cart-thanks.wav?v=3",
      );
      audio.volume = 0.85;
      void audio.play();
    } catch {
      /* ignore */
    }
  }, [mode]);

  const filterForMode = useCallback(
    (list: StoreDisplayOrder[]) => {
      let filtered =
        mode === "kitchen"
          ? list.filter((o) => o.status !== "提供済み")
          : list.filter((o) => COUNTER_VISIBLE.includes(o.status));

      if (!showTableQuad && tableId) {
        filtered = filtered.filter((o) => orderMatchesStoreTable(o, tableId));
      }

      filtered.sort((a, b) => {
        if (a.status === "完成" && b.status !== "完成") return -1;
        if (b.status === "完成" && a.status !== "完成") return 1;
        return (
          (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0)
        );
      });
      return filtered;
    },
    [mode, tableId, showTableQuad],
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/store-display/feed", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) return;
    setAuthed(true);
    const data = await res.json();
    if (data.configured === false) {
      setQueueWarning(String(data.message || ""));
    } else {
      setQueueWarning(null);
    }
    const list = Array.isArray(data.orders)
      ? (data.orders as StoreDisplayOrder[])
      : [];

    const filtered = filterForMode(list);

    if (!bootRef.current) {
      for (const o of filtered) {
        if (
          o.status === "受付済み" &&
          !seenRef.current.has(o.reservationNo)
        ) {
          seenRef.current.add(o.reservationNo);
          playNewOrderSound();
          break;
        }
      }
    } else {
      filtered.forEach((o) => seenRef.current.add(o.reservationNo));
      bootRef.current = false;
    }

    setOrders(filtered);
  }, [filterForMode, playNewOrderSound]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

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
    void refresh();
  }

  async function setStatus(
    reservationNo: string,
    status: StoreDisplayOrder["status"],
  ) {
    await fetch("/api/store-display/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationNo, status }),
    });
    void refresh();
  }

  if (authed === null) {
    return (
      <div className={styles.root}>
        <p className={styles.empty}>読み込み中…</p>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className={styles.root}>
        <form className={styles.pinScreen} onSubmit={submitPin}>
          <h1 className={styles.pinTitle}>{title}</h1>
          <p className={styles.pinSub}>店舗用 PIN を入力してください</p>
          <input
            className={styles.pinInput}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {pinError ? <p className={styles.pinError}>{pinError}</p> : null}
          <button type="submit" className={styles.pinBtn}>
            表示を開始
          </button>
        </form>
      </div>
    );
  }

  const tableIds = Array.from({ length: STORE_ORDER_TABLE_COUNT }, (_, i) =>
    String(i + 1),
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{title}</div>
          <div className={styles.headerMeta}>
            {mode === "kitchen" ? "調理・盛り付け" : "レジ・お席への提供"}
            {showTableQuad ? "・4卓分割" : ""}
          </div>
        </div>
        <div className={styles.headerMeta}>
          {showTableQuad ? (
            <span className={styles.headerRev}>{DISPLAY_UI_REV}</span>
          ) : null}{" "}
          {clock}
        </div>
      </header>

      {queueWarning ? <p className={styles.warn}>{queueWarning}</p> : null}

      {showTableQuad ? (
        <>
          <div className={styles.tableGrid} data-layout="quad-2x2">
            {tableIds.map((tid) => {
              const columnOrders = orders.filter((o) =>
                orderMatchesStoreTable(o, tid),
              );
              return (
                <section key={tid} className={styles.tableColumn}>
                  <h2 className={styles.tableColumnTitle}>
                    {storeTableLabel(tid)}
                  </h2>
                  {columnOrders.length === 0 ? (
                    <p className={styles.tableColumnEmpty}>注文なし</p>
                  ) : (
                    <div className={styles.tableColumnList}>
                      {columnOrders.map((order) => (
                        <StoreDisplayOrderCard
                          key={order.reservationNo}
                          order={order}
                          mode={mode}
                          onSetStatus={setStatus}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          {(() => {
            const unassigned = orders.filter(
              (o) => !tableIds.some((tid) => orderMatchesStoreTable(o, tid)),
            );
            if (!unassigned.length) return null;
            return (
              <section className={styles.tableColumnUnassigned}>
                <h2 className={styles.tableColumnTitle}>卓未設定</h2>
                <div className={styles.tableColumnList}>
                  {unassigned.map((order) => (
                    <StoreDisplayOrderCard
                      key={order.reservationNo}
                      order={order}
                      mode={mode}
                      onSetStatus={setStatus}
                    />
                  ))}
                </div>
              </section>
            );
          })()}
        </>
      ) : orders.length === 0 ? (
        <p className={styles.empty}>新しいご注文はありません</p>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => (
            <StoreDisplayOrderCard
              key={order.reservationNo}
              order={order}
              mode={mode}
              onSetStatus={setStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
