import Link from "next/link";
import { reservationMaintenanceMessageText } from "../../../lib/reservationMaintenance";

export default function ReservationMaintenancePage() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-left shadow-sm">
        <p className="text-lg leading-[1.85] text-stone-800 whitespace-pre-wrap break-words">
          {reservationMaintenanceMessageText()}
        </p>

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
