"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isStoreOrderDineInClient } from "../../../lib/storeOrderDineIn";
import {
  readStoreOrderDraft,
  storeCartQuantity,
  writeStoreOrderDraft,
} from "../../../lib/storeOrderDraft";
import { STORE_ORDER_BUSY_DISCLAIMER } from "../../../lib/storeOrderCopy";
import styles from "../order.module.css";

export default function StoreOrderCustomerPage() {
  const router = useRouter();
  const dineIn = isStoreOrderDineInClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (dineIn) {
      router.replace("/order/confirm");
      return;
    }

    const draft = readStoreOrderDraft();
    if (storeCartQuantity(draft.items) <= 0 || !draft.pickupTime) {
      router.replace("/order/menu");
      return;
    }
    setName(draft.customerName || "");
    setPhone(draft.phone || "");
    setNote(draft.note || "");
  }, [router, dineIn]);

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

  if (dineIn) {
    return (
      <main className={styles.page}>
        <p className={styles.stepNote}>読み込み中…</p>
      </main>
    );
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
          <p className={styles.stepNote}>{STORE_ORDER_BUSY_DISCLAIMER}</p>
          <p className={styles.stepNote}>
            お支払いは店頭受け取り時となります。
          </p>
          <button type="submit" className={styles.primaryBtn}>
            内容確認へ
          </button>
        </form>
      </section>
    </main>
  );
}
