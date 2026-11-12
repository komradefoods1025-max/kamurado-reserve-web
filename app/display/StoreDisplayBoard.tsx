"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  orderHasVisibleKitchenItems,
  type StoreDisplayOrder,
} from "../../lib/storeDisplayQueue";
import {
  buildUnsettledTableOrderSummary,
  type StoreTableRunningTotals,
} from "../../lib/storeTableSettlement";
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

/** キッチンで「完成」表示を残す秒数（経過後は画面から消す） */
const KITCHEN_COMPLETE_VISIBLE_MS = 5000;

/** 店舗表示 UI 世代（キャッシュ確認用・ヘッダーに表示） */
const DISPLAY_UI_REV = "item-done-v2";

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
  const [feedOrders, setFeedOrders] = useState<StoreDisplayOrder[]>([]);
  const [tableTotals, setTableTotals] = useState<StoreTableRunningTotals>({});
  const [settlements, setSettlements] = useState<Record<string, string>>({});
  const [settlingTable, setSettlingTable] = useState<string | null>(null);
  const [reviewTableId, setReviewTableId] = useState<string | null>(null);
  const [queueWarning, setQueueWarning] = useState<string | null>(null);
  const [clock, setClock] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const seenRef = useRef<Set<string>>(new Set());
  const bootRef = useRef(true);
  /** 完成カードを表示し続ける期限（reservationNo → epoch ms） */
  const completeVisibleUntilRef = useRef(new Map<string, number>());
  const [hideTick, setHideTick] = useState(0);

  const touchCompleteHideTimer = useCallback((reservationNo: string) => {
    completeVisibleUntilRef.current.set(
      reservationNo,
      Date.now() + KITCHEN_COMPLETE_VISIBLE_MS,
    );
    window.setTimeout(
      () => setHideTick((n) => n + 1),
      KITCHEN_COMPLETE_VISIBLE_MS + 50,
    );
  }, []);

  const syncCompleteHideTimers = useCallback((list: StoreDisplayOrder[]) => {
    const active = new Set<string>();
    for (const o of list) {
      if (o.status !== "完成") {
        completeVisibleUntilRef.current.delete(o.reservationNo);
        continue;
      }
      active.add(o.reservationNo);
      if (!completeVisibleUntilRef.current.has(o.reservationNo)) {
        touchCompleteHideTimer(o.reservationNo);
      }
    }
    for (const no of completeVisibleUntilRef.current.keys()) {
      if (!active.has(no)) completeVisibleUntilRef.current.delete(no);
    }
  }, [touchCompleteHideTimer]);

  const kitchenCompleteStillVisible = useCallback(
    (order: StoreDisplayOrder) => {
      if (order.status !== "完成") return true;
      const until = completeVisibleUntilRef.current.get(order.reservationNo);
      if (!until) return false;
      return Date.now() < until;
    },
    [hideTick],
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowMs(now.getTime());
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
          ? list.filter(
              (o) =>
                o.status !== "提供済み" &&
                kitchenCompleteStillVisible(o) &&
                orderHasVisibleKitchenItems(o, nowMs),
            )
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
    [mode, tableId, showTableQuad, kitchenCompleteStillVisible, nowMs],
  );

  const orders = useMemo(
    () => filterForMode(feedOrders),
    [feedOrders, filterForMode, hideTick, nowMs],
  );

  const reviewSummary = useMemo(() => {
    if (!reviewTableId) return [];
    return buildUnsettledTableOrderSummary(
      feedOrders,
      reviewTableId,
      settlements,
    );
  }, [reviewTableId, feedOrders, settlements]);

  const reviewTotal = useMemo(
    () => reviewSummary.reduce((sum, line) => sum + line.subtotal, 0),
    [reviewSummary],
  );

  useEffect(() => {
    if (mode !== "kitchen") return;
    const id = window.setInterval(() => {
      const pending = [...completeVisibleUntilRef.current.values()].some(
        (until) => Date.now() < until,
      );
      if (pending) setHideTick((n) => n + 1);
    }, 500);
    return () => window.clearInterval(id);
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

    if (mode === "kitchen") syncCompleteHideTimers(list);

    if (!bootRef.current) {
      for (const o of list) {
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
      list.forEach((o) => seenRef.current.add(o.reservationNo));
      bootRef.current = false;
    }

    const totals = data.tableTotals;
    if (totals && typeof totals === "object") {
      setTableTotals(totals as StoreTableRunningTotals);
    }
    const settled = data.settlements;
    if (settled && typeof settled === "object") {
      setSettlements(settled as Record<string, string>);
    }

    setFeedOrders(list);
  }, [mode, playNewOrderSound, syncCompleteHideTimers]);

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

  async function settleTable(tableId: string) {
    const label = storeTableLabel(tableId);
    const row = tableTotals[tableId];
    const amount = row?.total ?? 0;
    const msg =
      amount > 0
        ? `${label}を清算しますか？\n未清算の合計 ¥${amount.toLocaleString("ja-JP")} をリセットします。`
        : `${label}を清算済みにしますか？\nこのあとの注文から合計を加算します。`;
    if (!window.confirm(msg)) return;

    setSettlingTable(tableId);
    try {
      const res = await fetch("/api/store-display/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        window.alert(data.message || "清算に失敗しました");
        return;
      }
      if (data.tableTotals) {
        setTableTotals(data.tableTotals as StoreTableRunningTotals);
      }
      void refresh();
    } finally {
      setSettlingTable(null);
    }
  }

  async function setItemKitchenDone(
    reservationNo: string,
    itemIndex: number,
    done: boolean,
  ) {
    await fetch("/api/store-display/item-done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationNo, itemIndex, done }),
    });
    void refresh();
  }

  async function setStatus(
    reservationNo: string,
    status: StoreDisplayOrder["status"],
  ) {
    if (mode === "kitchen" && status === "完成") {
      touchCompleteHideTimer(reservationNo);
    }
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
              const running = tableTotals[tid];
              const runningTotal = running?.total ?? 0;
              const runningCount = running?.orderCount ?? 0;
              return (
                <section key={tid} className={styles.tableColumn}>
                  <div className={styles.tableColumnHead}>
                    <h2 className={styles.tableColumnTitle}>
                      {storeTableLabel(tid)}
                    </h2>
                    {mode === "kitchen" ? (
                      <>
                        <p className={styles.tableColumnTotal}>
                          合計 ¥{runningTotal.toLocaleString("ja-JP")}
                          {runningCount > 0 ? (
                            <span className={styles.tableColumnTotalMeta}>
                              （{runningCount}件）
                            </span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          className={styles.tableSettleBtn}
                          disabled={settlingTable === tid}
                          onClick={() => void settleTable(tid)}
                        >
                          {settlingTable === tid ? "処理中…" : "清算"}
                        </button>
                        <button
                          type="button"
                          className={styles.tableReviewBtn}
                          onClick={() => setReviewTableId(tid)}
                        >
                          注文確認
                        </button>
                      </>
                    ) : null}
                  </div>
                  {columnOrders.length === 0 ? (
                    <p className={styles.tableColumnEmpty}>注文なし</p>
                  ) : (
                    <div className={styles.tableColumnList}>
                      {columnOrders.map((order) => (
                        <StoreDisplayOrderCard
                          key={order.reservationNo}
                          order={order}
                          mode={mode}
                          nowMs={mode === "kitchen" ? nowMs : undefined}
                          onSetStatus={setStatus}
                          onSetItemDone={
                            mode === "kitchen" ? setItemKitchenDone : undefined
                          }
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
                      nowMs={mode === "kitchen" ? nowMs : undefined}
                      onSetStatus={setStatus}
                      onSetItemDone={
                        mode === "kitchen" ? setItemKitchenDone : undefined
                      }
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
              nowMs={mode === "kitchen" ? nowMs : undefined}
              onSetStatus={setStatus}
              onSetItemDone={
                mode === "kitchen" ? setItemKitchenDone : undefined
              }
            />
          ))}
        </div>
      )}

      {reviewTableId && mode === "kitchen" ? (
        <div
          className={styles.reviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-order-review-title"
          onClick={() => setReviewTableId(null)}
        >
          <div
            className={styles.reviewPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="table-order-review-title" className={styles.reviewTitle}>
              {storeTableLabel(reviewTableId)}　注文確認
            </h3>
            <div className={styles.reviewBody}>
              {reviewSummary.length === 0 ? (
                <p className={styles.reviewEmpty}>
                  未清算の注文はありません
                </p>
              ) : (
                <ul className={styles.reviewList}>
                  {reviewSummary.map((line) => (
                    <li key={line.label} className={styles.reviewRow}>
                      <span className={styles.reviewRowName}>{line.label}</span>
                      <span className={styles.reviewRowQty}>×{line.qty}</span>
                      <span className={styles.reviewRowSub}>
                        ¥{line.subtotal.toLocaleString("ja-JP")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.reviewFooter}>
              {reviewSummary.length > 0 ? (
                <p className={styles.reviewFooterTotal}>
                  合計 ¥{reviewTotal.toLocaleString("ja-JP")}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.reviewCloseBtn}
                onClick={() => setReviewTableId(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
