"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StartReservationButton from "../../../components/StartReservationButton";
import ReserveStepNav from "../../../components/ReserveStepNav";
import reserveStyles from "../../../components/reserve.module.css";

type ReservationDraft = {
  items: Array<{ quantity?: number }>;
};

const STORAGE_KEYS = [
  "kamurado-reserve-draft",
  "kamurado-reservation-draft",
  "reservationDraft",
  "webReservationDraft",
];

function readDraft(): ReservationDraft {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  for (const key of STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return { items: parsed.items };
      }
    } catch {
      continue;
    }
  }

  return { items: [] };
}

export default function ReserveMenuPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasItems, setHasItems] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    const itemCount = draft.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    setHasItems(itemCount > 0);
    setMounted(true);

    if (itemCount > 0) {
      router.replace("/reserve/cart");
    }
  }, [router]);

  if (!mounted || hasItems) {
    return null;
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6">
      <div className="mx-auto w-full max-w-[920px]">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-sm tracking-[0.2em] text-amber-800">RESERVE</p>
          <h1 className={`mt-2 ${reserveStyles.reserveTitle}`}>
            かむらど お弁当ご予約
          </h1>

          <ReserveStepNav activeStep={1} />

          <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <p className="text-base leading-relaxed text-stone-700 sm:text-lg">
              カートに商品が入っていません。メニューから商品を選んでください。
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/menu"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-semibold text-white sm:text-base"
              >
                メニューに戻る
              </Link>
              <StartReservationButton
                href="/menu"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                ご予約をはじめる
              </StartReservationButton>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
