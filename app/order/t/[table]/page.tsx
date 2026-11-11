import { redirect } from "next/navigation";
import { normalizeStoreTableId } from "../../../../lib/storeOrderTables";

type PageProps = {
  params: Promise<{ table: string }>;
};

/** 卓QR（ミドルウェアで先にリダイレクト — ここはフォールバック） */
export default async function StoreOrderTableEntryPage({ params }: PageProps) {
  const { table } = await params;
  const tableId = normalizeStoreTableId(table);
  if (!tableId) {
    redirect("/order");
  }
  redirect(`/order/menu?table=${encodeURIComponent(tableId)}`);
}
