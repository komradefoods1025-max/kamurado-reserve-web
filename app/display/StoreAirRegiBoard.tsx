"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AirRegiCatalogSlot } from "../../lib/storeAirRegiCodes";
import type { AirRegiRegisterLine } from "../../lib/storeAirRegiRegister";
import {
  formatAirRegiLinesForClipboard,
  airRegiRegisterLineStats,
  buildAirRegiRegisterLines,
} from "../../lib/storeAirRegiRegister";
import type { StoreDisplayOrder } from "../../lib/storeDisplayQueue";
import {
  resolveStoreOrderTableId,
  storeTableLabel,
} from "../../lib/storeOrderTables";
import styles from "./display.module.css";
import { useStoreDisplaySession } from "./useStoreDisplaySession";

type Panel = "orders" | "catalog";

export default function StoreAirRegiBoard() {
  const { authed, pin, setPin, pinError, submitPin } = useStoreDisplaySession();
  const [panel, setPanel] = useState<Panel>("orders");
  const [orders, setOrders] = useState<StoreDisplayOrder[]>([]);
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [lines, setLines] = useState<AirRegiRegisterLine[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [catalogSlots, setCatalogSlots] = useState<AirRegiCatalogSlot[]>([]);
  const [catalogStats, setCatalogStats] = useState<{
    total: number;
    mapped: number;
    unmapped: number;
  } | null>(null);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [catalogUnmappedOnly, setCatalogUnmappedOnly] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const refreshOrders = useCallback(async () => {
    const res = await fetch("/api/store-display/feed", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data.orders)
      ? (data.orders as StoreDisplayOrder[])
      : [];
    list.sort(
      (a, b) =>
        (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0),
    );
    setOrders(list);
  }, []);

  const loadCatalog = useCallback(async () => {
    const res = await fetch("/api/store-display/airregi?view=catalog", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    setCatalogSlots(Array.isArray(data.slots) ? data.slots : []);
    setCatalogStats(data.stats ?? null);
  }, []);

  const selectOrder = useCallback((order: StoreDisplayOrder) => {
    setSelectedNo(order.reservationNo);
    const built = buildAirRegiRegisterLines(order);
    setLines(built);
    setChecked({});
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    void refreshOrders();
    const id = window.setInterval(() => void refreshOrders(), 4000);
    return () => window.clearInterval(id);
  }, [authed, refreshOrders]);

  useEffect(() => {
    if (authed === true && panel === "catalog") {
      void loadCatalog();
    }
  }, [authed, panel, loadCatalog]);

  const lineStats = useMemo(
    () => airRegiRegisterLineStats(lines),
    [lines],
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    return catalogSlots.filter((slot) => {
      if (catalogUnmappedOnly && slot.mapping?.code) return false;
      if (!q) return true;
      const hay = [
        slot.menuKey,
        slot.menuName,
        slot.categoryLabel,
        slot.lookupKey,
        slot.mapping?.code,
        slot.dressing,
        slot.secondaryDressing,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [catalogSlots, catalogFilter, catalogUnmappedOnly]);

  async function copyLines() {
    const text = formatAirRegiLinesForClipboard(lines);
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("クリップボードにコピーしました");
    } catch {
      setCopyHint("コピーに失敗しました");
    }
    window.setTimeout(() => setCopyHint(""), 2500);
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
          <h1 className={styles.pinTitle}>レジ打ち込み</h1>
          <p className={styles.pinSub}>店舗用 PIN（表示画面と同じ）</p>
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

  const selectedOrder =
    selectedNo != null
      ? orders.find((o) => o.reservationNo === selectedNo) ?? null
      : null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>レジ打ち込み</div>
          <div className={styles.headerMeta}>
            Airレジ用コード・商品名の照合（自動連携ではありません）
          </div>
        </div>
        <div className={styles.headerMeta}>
          <Link href="/display/counter" className={styles.headerLink}>
            カウンター表示へ
          </Link>
        </div>
      </header>

      <div className={styles.airRegiTabs}>
        <button
          type="button"
          className={
            panel === "orders"
              ? `${styles.airRegiTab} ${styles.airRegiTabActive}`
              : styles.airRegiTab
          }
          onClick={() => setPanel("orders")}
        >
          注文から打ち込む
        </button>
        <button
          type="button"
          className={
            panel === "catalog"
              ? `${styles.airRegiTab} ${styles.airRegiTabActive}`
              : styles.airRegiTab
          }
          onClick={() => setPanel("catalog")}
        >
          商品コード一覧
          {catalogStats
            ? `（${catalogStats.mapped}/${catalogStats.total}）`
            : ""}
        </button>
      </div>

      {panel === "orders" ? (
        <div className={styles.airRegiLayout}>
          <aside className={styles.airRegiOrderList}>
            <p className={styles.airRegiAsideTitle}>本日の注文</p>
            {orders.length === 0 ? (
              <p className={styles.empty}>注文はありません</p>
            ) : (
              orders.map((order) => {
                const tid = resolveStoreOrderTableId(order);
                const active = order.reservationNo === selectedNo;
                const unmapped = buildAirRegiRegisterLines(order).filter(
                  (l) => !l.mapped,
                ).length;
                return (
                  <button
                    key={order.reservationNo}
                    type="button"
                    className={
                      active
                        ? `${styles.airRegiOrderBtn} ${styles.airRegiOrderBtnActive}`
                        : styles.airRegiOrderBtn
                    }
                    onClick={() => selectOrder(order)}
                  >
                    <span className={styles.airRegiOrderNo}>
                      {order.reservationNo}
                    </span>
                    <span className={styles.airRegiOrderMeta}>
                      {tid ? storeTableLabel(tid) : "卓未設定"}・
                      {order.pickupTime || "店内"}
                    </span>
                    {unmapped > 0 ? (
                      <span className={styles.airRegiOrderWarn}>
                        未設定 {unmapped}行
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </aside>

          <section className={styles.airRegiDetail}>
            {!selectedOrder ? (
              <p className={styles.empty}>左から注文を選んでください</p>
            ) : (
              <>
                <div className={styles.airRegiDetailHead}>
                  <h2 className={styles.airRegiDetailTitle}>
                    {selectedOrder.reservationNo}
                    {resolveStoreOrderTableId(selectedOrder)
                      ? ` / ${storeTableLabel(resolveStoreOrderTableId(selectedOrder)!)}`
                      : ""}
                  </h2>
                  <div className={styles.airRegiDetailActions}>
                    <button
                      type="button"
                      className={styles.airRegiCopyBtn}
                      onClick={() => void copyLines()}
                    >
                      一覧をコピー
                    </button>
                    {copyHint ? (
                      <span className={styles.airRegiCopyHint}>{copyHint}</span>
                    ) : null}
                  </div>
                </div>

                {!lineStats.allMapped && lineStats.lineCount > 0 ? (
                  <p className={styles.warn}>
                    コード未設定の行があります（{lineStats.unmapped}/
                    {lineStats.lineCount}）。「商品コード一覧」で
                    lib/storeAirRegiCodes.ts またはメニューの airRegiCode
                    を登録してください。
                  </p>
                ) : null}

                <table className={styles.airRegiTable}>
                  <thead>
                    <tr>
                      <th className={styles.airRegiThCheck}>済</th>
                      <th>コード</th>
                      <th>数量</th>
                      <th>商品</th>
                      <th>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((row, idx) => (
                      <tr
                        key={`${row.menuKey}-${row.dressing ?? ""}-${idx}`}
                        className={
                          row.mapped ? undefined : styles.airRegiRowUnmapped
                        }
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={Boolean(checked[idx])}
                            onChange={(e) =>
                              setChecked((prev) => ({
                                ...prev,
                                [idx]: e.target.checked,
                              }))
                            }
                            aria-label={`${row.displayName} 入力済み`}
                          />
                        </td>
                        <td className={styles.airRegiCodeCell}>
                          {row.mapping?.code ?? "—"}
                        </td>
                        <td className={styles.airRegiQtyCell}>{row.qty}</td>
                        <td>{row.displayName}</td>
                        <td className={styles.airRegiNoteCell}>
                          {row.mapping?.handyName ?? row.mapping?.note ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.airRegiFootnote}>
                  menuKey:{" "}
                  {lines.map((l) => l.menuKey).filter(Boolean).join(", ")}
                </p>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className={styles.airRegiCatalog}>
          <div className={styles.airRegiCatalogToolbar}>
            <input
              className={styles.airRegiSearch}
              type="search"
              placeholder="商品名・キー・コードで検索"
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
            />
            <label className={styles.airRegiCheckLabel}>
              <input
                type="checkbox"
                checked={catalogUnmappedOnly}
                onChange={(e) => setCatalogUnmappedOnly(e.target.checked)}
              />
              未設定のみ
            </label>
          </div>
          {catalogStats ? (
            <p className={styles.airRegiCatalogStats}>
              設定済み {catalogStats.mapped} / {catalogStats.total} 行（バリエーション展開）
            </p>
          ) : null}
          <p className={styles.airRegiFootnote}>
            コードの登録:{" "}
            <code className={styles.airRegiInlineCode}>
              lib/storeAirRegiCodes.ts
            </code>
            の AIR_REGI_PRODUCT_CODES、または{" "}
            <code className={styles.airRegiInlineCode}>airRegiCode</code> /
            <code className={styles.airRegiInlineCode}>airRegiOptionCodes</code>
            （storeMenuCatalog）
          </p>
          <div className={styles.airRegiCatalogScroll}>
            <table className={styles.airRegiTable}>
              <thead>
                <tr>
                  <th>カテゴリ</th>
                  <th>商品</th>
                  <th>バリエーション</th>
                  <th>コード</th>
                  <th>lookupKey</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((slot) => (
                  <tr
                    key={slot.lookupKey}
                    className={
                      slot.mapping?.code ? undefined : styles.airRegiRowUnmapped
                    }
                  >
                    <td>{slot.categoryLabel}</td>
                    <td>{slot.menuName}</td>
                    <td>
                      {[slot.dressing, slot.secondaryDressing]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className={styles.airRegiCodeCell}>
                      {slot.mapping?.code ?? "—"}
                    </td>
                    <td className={styles.airRegiKeyCell}>{slot.lookupKey}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}