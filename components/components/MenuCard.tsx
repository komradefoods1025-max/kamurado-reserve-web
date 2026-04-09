

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isSoldOut?: boolean;
  badge?: string;
};

type MenuCardProps = {
  item: MenuItem;
  quantity?: number;
  onAdd?: (item: MenuItem) => void;
};

export default function MenuCard({
  item,
  quantity = 0,
  onAdd,
}: MenuCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-stone-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
            NO IMAGE
          </div>
        )}

        {item.badge ? (
          <div className="absolute left-3 top-3 rounded-full bg-amber-900 px-3 py-1 text-xs font-medium text-white">
            {item.badge}
          </div>
        ) : null}

        {item.isSoldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              売り切れ
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-stone-800">{item.name}</h3>
          <p className="shrink-0 text-base font-bold text-amber-900">
            ¥{item.price.toLocaleString("ja-JP")}
          </p>
        </div>

        <p className="mt-2 min-h-[3rem] text-sm leading-6 text-stone-600">
          {item.description || "こだわりの一品をお楽しみください。"}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm text-stone-500">
            {quantity > 0 ? `カート内 ${quantity}点` : "カート追加できます"}
          </div>

          <button
            type="button"
            onClick={() => onAdd?.(item)}
            disabled={item.isSoldOut}
            className="rounded-2xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {item.isSoldOut ? "受付停止中" : "カートに追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
