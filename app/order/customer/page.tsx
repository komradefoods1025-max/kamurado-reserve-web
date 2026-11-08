"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
} from "../../../lib/storeOrderDraft";
import styles from "../order.module.css";

export default function StoreOrderCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const draft = readStoreOrderDraft();
    if (storeCartQuantity(draft.items) <= 0 || !draft.pickupTime) {
      router.replace("/order/menu");
      return;
    }
    setName(draft.customerName || "");
    setPhone(draft.phone || "");
    setNote(draft.note || "");
  }, [router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = phone.replace(/[^\d]/g, "");
    if (!trimmedName || digits.length < 10) return;

    const draft = readStoreOrderDraft();
    writeStoreOrderDraft({
      ...draft,
      customerName: trimmedName,
      phone: digits,
      note: note.trim(),
    });
    router.push("/order/confirm");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>お客様情報</h1>
        <p className={styles.sub}>お名前とお電話番号をご入力ください</p>
      </header>

      <section className={styles.section}>
        <form className={styles.panel} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="store-name">
              お名前
            </label>
            <input
              id="store-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="store-phone">
              電話番号
            </label>
            <input
              id="store-phone"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="store-note">
              ご要望（任意）
            </label>
            <input
              id="store-note"
              className={styles.input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <p className={styles.stepNote}>
            お支払いは店頭受け取り時となります。
          </p>
          <button type="submit" className={styles.primaryBtn}>
            内容確認へ
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => router.push("/order/menu")}
        className={styles.stepNote}
        style={{
          display: "block",
          margin: "0 auto",
          background: "none",
          border: "none",
          color: "#c4b8a8",
          textDecoration: "underline",
        }}
      >
        注文内容を変更
      </button>
    </main>
  );
}
