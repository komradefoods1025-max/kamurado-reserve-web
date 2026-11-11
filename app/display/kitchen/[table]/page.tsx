import StoreDisplayBoard from "../../StoreDisplayBoard";
import { parseDisplayTableRouteParam } from "../../../../lib/storeDisplayTableParams";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ table: string }> };

export default async function StoreDisplayKitchenTablePage({ params }: Props) {
  const { table } = await params;
  const { tableId, titleSuffix } = parseDisplayTableRouteParam(table);
  if (!tableId) notFound();

  return (
    <StoreDisplayBoard
      mode="kitchen"
      title={titleSuffix ? `キッチン ${titleSuffix}` : "キッチン"}
      tableId={tableId}
    />
  );
}
