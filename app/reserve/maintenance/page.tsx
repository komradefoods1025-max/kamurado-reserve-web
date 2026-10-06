import Link from "next/link";
import {
  RESERVATION_MAINTENANCE_TEL,
  reservationMaintenanceMessageText,
} from "../../../lib/reservationMaintenance";

export default function ReservationMaintenancePage() {
  const lines = reservationMaintenanceMessageText().split("\n");

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {lines.map((line) => (
          <p
            key={line}
            className="text-lg leading-relaxed text-stone-800 whitespace-pre-wrap"
          >
            {line.startsWith("TEL ") ? (
              <>
                <a
                  href={`tel:${RESERVATION_MAINTENANCE_TEL.replace(/-/g, "")}`}
                  className="font-semibold text-amber-900 underline underline-offset-2"
                >
                  {line}
                </a>
              </>
            ) : (
              line
            )}
          </p>
        ))}

        <p className="mt-8 text-sm text-stone-500">
          <Link href="/reserve/check" className="underline underline-offset-2">
            予約確認・キャンセル
          </Link>
          はこちら
        </p>
      </div>
    </main>
  );
}
