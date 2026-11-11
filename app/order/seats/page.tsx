"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  STORE_ORDER_TABLE_COUNT,
  storeTableLabel,
} from "../../../lib/storeOrderTables";
import styles from "../order.module.css";
import seatStyles from "./seats.module.css";

type SeatQr = {
  tableId: string;
  label: string;
  url: string;
  dataUrl: string;
};

export default function StoreOrderSeatsQrPage() {
  const [seats, setSeats] = useState<SeatQr[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;

    setOrigin(base);

    void (async () => {
      const rows: SeatQr[] = [];
      for (let i = 1; i <= STORE_ORDER_TABLE_COUNT; i++) {
        const tableId = String(i);
        const url = `${base}/order/t/${tableId}`;
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 2,
          width: 280,
          color: { dark: "#1a1008", light: "#fff9f0" },
        });
        rows.push({
          tableId,
          label: storeTableLabel(tableId),
          url,
          dataUrl,
        });
      }
      setSeats(rows);
    })();
  }, []);

  return (
    <main className={`${styles.page} ${seatStyles.seatsPage}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>各卓オーダー用 QR</h1>
        <p className={styles.sub}>
          印刷して卓に置いてください。読み取り後、その卓の番号で注文されます。
        </p>
      </header>

      <p className={seatStyles.originNote}>
        ベースURL: <span className={seatStyles.originUrl}>{origin || "…"}</span>
      </p>

      <div className={seatStyles.qrGrid}>
        {seats.map((seat) => (
          <article key={seat.tableId} className={seatStyles.qrCard}>
            <h2 className={seatStyles.qrTitle}>{seat.label}</h2>
            {seat.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={seatStyles.qrImage}
                src={seat.dataUrl}
                alt={`${seat.label}のオーダーQR`}
                width={280}
                height={280}
              />
            ) : (
              <p className={styles.stepNote}>生成中…</p>
            )}
            <p className={seatStyles.qrUrl}>{seat.url}</p>
          </article>
        ))}
      </div>

      <p className={seatStyles.printHint}>
        ブラウザの「印刷」で A4 に4枚並べて印刷できます。
      </p>
    </main>
  );
}
