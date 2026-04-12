"use client";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  label?: string;
  itemType?: "bento" | "drink" | "extra";
};

type Props = {
  item: MenuItem;
  cartQty: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
};

export default function MenuCard({
  item,
  cartQty,
  onIncrement,
  onDecrement,
}: Props) {
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
          height: 160,
          background:
            item.imageUrl && item.imageUrl.trim()
              ? "transparent"
              : "linear-gradient(135deg, rgba(110,75,42,0.08), rgba(184,139,67,0.14))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(189,167,142,0.25)",
          overflow: "hidden",
        }}
      >
        {item.imageUrl && item.imageUrl.trim() ? (
          <img
            src={item.imageUrl}
            alt={item.name}
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
              textAlign: "center",
              color: "#8a6240",
              fontWeight: 700,
              letterSpacing: "0.12em",
              fontSize: 14,
            }}
          >
            KAMURADO
          </div>
        )}
      </div>

      <div
        className="p-6"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
            {item.label ? (
              <div
                className="rounded-full bg-amber-900 text-white"
                style={{
                  display: "inline-flex",
                  marginBottom: 12,
                  fontSize: 13,
                  padding: "7px 14px",
                }}
              >
                {item.label}
              </div>
            ) : null}

            <h3
              style={{
                fontSize: 22,
                lineHeight: 1.35,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
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
                }}
                aria-label={`${item.name}を1つ減らす`}
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
                aria-label={`${item.name}を1つ増やす`}
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
