"use client";

export type ReserveMenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  label?: string;
  itemType?: "bento" | "drink" | "extra";
};

type MenuCardProps = {
  item: ReserveMenuItem;
  cartQty: number;
  onIncrement: (item: ReserveMenuItem) => void;
  onDecrement: (item: ReserveMenuItem) => void;
};

export default function MenuCard({
  item,
  cartQty,
  onIncrement,
  onDecrement,
}: MenuCardProps) {
  const typeLabel =
    item.itemType === "drink"
      ? "ドリンク"
      : item.itemType === "extra"
      ? "追加メニュー"
      : item.label || "お弁当";

  return (
    <article
      className="rounded-3xl border border-stone-200 bg-white"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 420,
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, rgba(245,240,232,1) 0%, rgba(237,230,218,1) 100%)",
          overflow: "hidden",
        }}
      >
        {item.imageUrl ? (
          <img
  src={encodeURI(item.imageUrl)}
  alt={item.name}
  referrerPolicy="no-referrer"
  onError={(e) => {
    e.currentTarget.style.display = "none";
  }}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  }}
/>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9a6b3d",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontSize: 18,
            }}
          >
            KAMURADO
          </div>
        )}
      </div>

      <div
        style={{
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="rounded-full"
              style={{
                display: "inline-flex",
                marginBottom: 12,
                fontSize: 13,
                padding: "7px 14px",
                background: "#f2ece4",
                color: "#6f4a2a",
                fontWeight: 700,
              }}
            >
              {typeLabel}
            </div>

            <h3
              style={{
                fontSize: 22,
                lineHeight: 1.35,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                color: "#2d241c",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {item.name}
            </h3>
          </div>

          <div
            style={{
              flexShrink: 0,
              color: "#b88b43",
              fontWeight: 700,
              fontSize: 18,
              whiteSpace: "nowrap",
            }}
          >
            ¥{item.price.toLocaleString("ja-JP")}
          </div>
        </div>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.9,
            minHeight: 88,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            color: "#6d6258",
            margin: 0,
          }}
        >
          {item.description ?? ""}
        </p>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              color: "#6d6258",
              fontSize: 15,
              marginBottom: 12,
            }}
          >
            {cartQty > 0 ? `カート内 ${cartQty}点` : "カートに追加できます"}
          </div>

          {cartQty > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => onDecrement(item)}
                className="inline-flex items-center justify-center border"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  fontSize: 28,
                  background: "#fffdf9",
                  borderColor: "#e7ddd0",
                  color: "#2d241c",
                }}
              >
                −
              </button>

              <div
                style={{
                  minWidth: 60,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#2d241c",
                }}
              >
                {cartQty}
              </div>

              <button
                type="button"
                onClick={() => onIncrement(item)}
                className="inline-flex items-center justify-center bg-amber-900 text-white"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  fontSize: 28,
                }}
              >
                ＋
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onIncrement(item)}
              className="inline-flex items-center justify-center bg-amber-900 text-white"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 18,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              カートに追加
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
