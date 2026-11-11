"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreDisplayOrder } from "../../lib/storeDisplayQueue";
import styles from "./display.module.css";

type BoardMode = "kitchen" | "counter";

const KITCHEN_FLOW: StoreDisplayOrder["status"][] = [
  "受付済み",
  "調理中",
  "完成",
];

const COUNTER_VISIBLE: StoreDisplayOrder["status"][] = [
  "完成",
  "提供済み",
  "受付済み",
  "調理中",
];

function itemLabel(item: StoreDisplayOrder["items"][number]) {
  const name = String(item.menuName || item.name || "").trim();
  const dressing = item.dressing ? `（${item.dressing}）` : "";
  return `${name}${dressing}`;
}

function itemQty(item: StoreDisplayOrder["items"][number]) {
  return Math.max(0, Number(item.qty ?? item.quantity ?? 0));
}

export default function StoreDisplayBoard({
  mode,
  title,
}: {
  mode: BoardMode;
  title: string;
}) {
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

    const filtered =
      mode === "kitchen"
        ? list.filter((o) => o.status !== "提供済み")
        : list.filter((o) => COUNTER_VISIBLE.includes(o.status));

    filtered.sort((a, b) => {
      if (a.status === "完成" && b.status !== "完成") return -1;
      if (b.status === "完成" && a.status !== "完成") return 1;
      return (
        (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0)
      );
    });

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
  }, [mode, playNewOrderSound]);

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

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{title}</div>
          <div className={styles.headerMeta}>
            {mode === "kitchen" ? "調理・盛り付け" : "レジ・お席への提供"}
          </div>
        </div>
        <div className={styles.headerMeta}>{clock}</div>
      </header>

      {queueWarning ? <p className={styles.warn}>{queueWarning}</p> : null}

      {orders.length === 0 ? (
        <p className={styles.empty}>新しいご注文はありません</p>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => {
            const isNew = order.status === "受付済み";
            return (
              <article
                key={order.reservationNo}
                className={
                  isNew ? `${styles.card} ${styles.cardNew}` : styles.card
                }
              >
                <div className={styles.cardHead}>
                  <span className={styles.cardNo}>{order.reservationNo}</span>
                  <span className={styles.statusTag}>{order.status}</span>
                  <span className={styles.cardTime}>{order.pickupTime}</span>
                </div>
                <h2 className={styles.cardName}>{order.name} 様</h2>
                {order.seatLabel ? (
                  <p className={styles.cardSeat}>席: {order.seatLabel}</p>
                ) : null}
                <div className={styles.itemList}>
                  {order.items.map((item, idx) => (
                    <div
                      key={`${order.reservationNo}-${idx}`}
                      className={
                        mode === "kitchen"
                          ? `${styles.itemRow} ${styles.itemRowKitchen}`
                          : styles.itemRow
                      }
                    >
                      <span>{itemLabel(item)}</span>
                      <span className={styles.itemQty}>×{itemQty(item)}</span>
                    </div>
                  ))}
                </div>
                {mode === "counter" ? (
                  <p className={styles.headerMeta} style={{ marginTop: 8 }}>
                    合計 ¥{order.total.toLocaleString("ja-JP")}（{order.totalQty}
                    点）・レジ精算
                  </p>
                ) : null}
                <div className={styles.actions}>
                  {mode === "kitchen"
                    ? KITCHEN_FLOW.map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={
                            order.status === st
                              ? `${styles.actBtn} ${styles.actBtnActive}`
                              : styles.actBtn
                          }
                          onClick={() => setStatus(order.reservationNo, st)}
                        >
                          {st}
                        </button>
                      ))
                    : (
                      <>
                        <button
                          type="button"
                          className={
                            order.status === "提供済み"
                              ? `${styles.actBtn} ${styles.actBtnActive}`
                              : styles.actBtn
                          }
                          onClick={() =>
                            setStatus(order.reservationNo, "提供済み")
                          }
                        >
                          提供済み
                        </button>
                        {order.status !== "完成" ? (
                          <button
                            type="button"
                            className={styles.actBtn}
                            onClick={() =>
                              setStatus(order.reservationNo, "完成")
                            }
                          >
                            完成に戻す
                          </button>
                        ) : null}
                      </>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
