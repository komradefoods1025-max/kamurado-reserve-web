import Link from "next/link";

const FLOW_STEPS = [
  {
    step: "STEP 1",
    title: "メニューを選ぶ",
    body: "お弁当・追加メニュー・ドリンクをお選びいただけます。",
    bg: "#fff8ef",
    border: "#e6d1b2",
  },
  {
    step: "STEP 2",
    title: "受取日時を選ぶ",
    body: "ご希望の日付と時間を選択してください。",
    bg: "#fdf3e6",
    border: "#e7cfa8",
  },
  {
    step: "STEP 3",
    title: "お客様情報を入力",
    body: "お名前とお電話番号を入力して確認へ進みます。",
    bg: "#fff9f2",
    border: "#ead8bb",
  },
  {
    step: "STEP 4",
    title: "予約を確定",
    body: "内容確認後、そのままご予約完了になります。",
    bg: "#fdf4e9",
    border: "#e7cfaa",
  },
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen px-4 py-6 text-stone-800"
      style={{
        background: "linear-gradient(180deg, #f5ede2 0%, #efe3d1 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <section
          className="overflow-hidden rounded-[32px]"
          style={{
            border: "1px solid #e2cfaf",
            background:
              "linear-gradient(135deg, rgba(252,247,238,0.98), rgba(244,235,221,0.96))",
            boxShadow: "0 20px 60px rgba(90, 63, 34, 0.10)",
          }}
        >
          <div
            className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8"
            style={{
              borderBottom: "1px solid #ead8bc",
              background:
                "linear-gradient(135deg, rgba(255,250,242,0.98), rgba(244,231,211,0.94))",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#8b5d34",
                }}
              />
              <div
                style={{
                  fontSize: 15,
                  letterSpacing: "0.18em",
                  color: "#8a6240",
                  fontWeight: 600,
                }}
              >
                KAMURADO RESERVE
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <h1
                  className="mb-4 text-[42px] font-bold leading-[1.18] text-[#221a14] sm:text-[58px]"
                  style={{ wordBreak: "keep-all" }}
                >
                  かむらど
                  <br />
                  お弁当ご予約ページ
                </h1>

                <div
                  style={{
                    width: 88,
                    height: 4,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #8b5d34, #d0a66d)",
                    marginBottom: 22,
                  }}
                />

                <p
                  className="max-w-2xl text-[18px] leading-[1.95] sm:text-[19px]"
                  style={{ color: "#6d6258" }}
                >
                  お受け取り日時を選び、お名前とお電話番号を入力するだけでご予約いただけます。
                </p>
              </div>

              <div
                className="rounded-[28px] p-5 sm:p-6"
                style={{
                  border: "1px solid #dfc5a0",
                  background:
                    "linear-gradient(135deg, #f3dfbf 0%, #ead1ae 100%)",
                  boxShadow: "0 12px 28px rgba(139, 93, 52, 0.10)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    padding: "8px 14px",
                    background: "#8b5d34",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    marginBottom: 16,
                  }}
                >
                  ご案内
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    color: "#5b4b3f",
                    fontSize: 16,
                    lineHeight: 1.9,
                  }}
                >
                  <p>当ページでお弁当のご予約ができます。</p>
                  <p>数量変更や追加注文もカート内で調整できます。</p>
                  <p>ご予約後に受付番号が表示されます。</p>
                  <p>予約確認・キャンセルもこのページから行えます。</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <Link
                href="/reserve/menu"
                className="inline-flex min-h-[68px] items-center justify-center rounded-[22px] px-6 py-4 text-center text-[22px] font-bold transition hover:opacity-95"
                style={{
                  background: "linear-gradient(135deg, #8b5d34, #a06d3f)",
                  color: "#ffffff",
                  boxShadow: "0 14px 28px rgba(139, 93, 52, 0.24)",
                }}
              >
                ご予約をはじめる
              </Link>

              <Link
                href="/reserve/check"
                className="inline-flex min-h-[68px] items-center justify-center rounded-[22px] px-6 py-4 text-center text-[22px] font-bold transition hover:opacity-95"
                style={{
                  background: "linear-gradient(135deg, #3f3125, #6d4d35)",
                  color: "#ffffff",
                  boxShadow: "0 14px 28px rgba(63, 49, 37, 0.20)",
                }}
              >
                予約確認・キャンセル
              </Link>

              <a
                href="#guide"
                className="inline-flex min-h-[68px] items-center justify-center rounded-[22px] px-6 py-4 text-center text-[22px] font-bold transition"
                style={{
                  background: "#fffdf9",
                  color: "#3f3125",
                  border: "1px solid #d8c19d",
                  boxShadow: "0 8px 22px rgba(88, 63, 39, 0.06)",
                }}
              >
                ご利用案内を見る
              </a>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <section className="mb-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2
                  className="text-[34px] font-bold leading-tight sm:text-[42px]"
                  style={{ color: "#2c221b" }}
                >
                  RESERVATION FLOW
                </h2>

                <div
                  className="hidden sm:block"
                  style={{
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: "#f1dfc5",
                    color: "#7d5938",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    border: "1px solid #dfc5a0",
                  }}
                >
                  4 STEPS
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FLOW_STEPS.map((item) => (
                  <article
                    key={item.step}
                    className="rounded-[26px] p-5"
                    style={{
                      background: item.bg,
                      border: `1px solid ${item.border}`,
                      boxShadow: "0 10px 24px rgba(88, 63, 39, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        padding: "7px 14px",
                        background: "#f0dcc0",
                        color: "#8a6240",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        marginBottom: 14,
                      }}
                    >
                      {item.step}
                    </div>

                    <h3
                      className="mb-3 text-[28px] font-bold leading-[1.35]"
                      style={{ color: "#2a211b" }}
                    >
                      {item.title}
                    </h3>

                    <p
                      className="text-[16px] leading-[1.9]"
                      style={{ color: "#6a6056" }}
                    >
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section id="guide" className="grid gap-4 md:grid-cols-2">
              <article
                className="rounded-[26px] p-5"
                style={{
                  background:
                    "linear-gradient(180deg, #fffdf9 0%, #f9efdf 100%)",
                  border: "1px solid #ead7b7",
                  boxShadow: "0 8px 24px rgba(88, 63, 39, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    padding: "7px 14px",
                    background: "#f1e0c8",
                    color: "#8a6240",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    marginBottom: 14,
                  }}
                >
                  GUIDE
                </div>

                <h3
                  className="mb-3 text-[28px] font-bold"
                  style={{ color: "#2a211b" }}
                >
                  ご利用案内
                </h3>

                <ul
                  className="space-y-3 text-[16px] leading-[1.9]"
                  style={{ color: "#655a50" }}
                >
                  <li>・メニュー画面から数量の追加・調整ができます。</li>
                  <li>・受取日時とお客様情報をご入力のうえご予約ください。</li>
                  <li>・内容確認後、受付番号が発行されます。</li>
                  <li>・予約確認・キャンセルは電話番号から確認できます。</li>
                </ul>
              </article>

              <article
                className="rounded-[26px] p-5"
                style={{
                  background:
                    "linear-gradient(180deg, #fffdfa 0%, #f6ead8 100%)",
                  border: "1px solid #e5cfad",
                  boxShadow: "0 8px 24px rgba(88, 63, 39, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    padding: "7px 14px",
                    background: "#f2dfc3",
                    color: "#8a6240",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    marginBottom: 14,
                  }}
                >
                  INFO
                </div>

                <h3
                  className="mb-3 text-[28px] font-bold"
                  style={{ color: "#2a211b" }}
                >
                  ご予約前に
                </h3>

                <ul
                  className="space-y-3 text-[16px] leading-[1.9]"
                  style={{ color: "#655a50" }}
                >
                  <li>・混雑状況によりご希望時間の受付が難しい場合があります。</li>
                  <li>・内容変更は確定前の画面でご確認ください。</li>
                  <li>・数量が多いご注文はお早めのご予約がおすすめです。</li>
                  <li>・キャンセルは予約確認ページから行えます。</li>
                </ul>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
