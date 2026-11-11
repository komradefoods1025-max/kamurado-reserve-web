import StoreDisplayBoard from "../../StoreDisplayBoard";
import { parseDisplayTableRouteParam } from "../../../../lib/storeDisplayTableParams";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ table: string }> };

export default async function StoreDisplayCounterTablePage({ params }: Props) {
  const { table } = await params;
  const { tableId, titleSuffix } = parseDisplayTableRouteParam(table);
  if (!tableId) notFound();

  return (
    <StoreDisplayBoard
      mode="counter"
      title={titleSuffix ? `レジ ${titleSuffix}` : "レジ"}
      tableId={tableId}
    />
  );
}
