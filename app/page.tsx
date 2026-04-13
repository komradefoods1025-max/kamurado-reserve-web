import Link from "next/link";

const FLOW_STEPS = [
  {
    step: "STEP 1",
    title: "メニューを選ぶ",
    body: "お弁当・追加メニュー・ドリンクをお選びいただけます。",
    tone: "bg-[#fffaf2] border-[#ead8ba]",
  },
  {
    step: "STEP 2",
    title: "受取日時を選ぶ",
    body: "ご希望の日付と時間を選択してください。",
    tone: "bg-[#fff8ee] border-[#e7d3b2]",
  },
  {
    step: "STEP 3",
    title: "お客様情報を入力",
    body: "お名前とお電話番号を入力して確認へ進みます。",
    tone: "bg-[#fffaf4] border-[#e8d9c1]",
  },
  {
    step: "STEP 4",
    title: "予約を確定",
    body: "内容確認後、そのままご予約完了になります。",
    tone: "bg-[#fff9f1] border-[#e9d6b8]",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f1e7_0%,#f3eadc_100%)] px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[32px] border border-[#e3d0b0] bg-[#fbf6ed] shadow-[0_18px_55px_rgba(96,66,34,0.10)]">
          <div className="border-b border-[#ead8bc] bg-[linear-gradient(135deg,rgba(255,250,241,0.96),rgba(246,236,219,0.92))] px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
            <div className="mb-5 inline-flex rounded-full border border-[#dec39d] bg-[#f7ead5] px-4 py-2 text-[14px] tracking-[0.18em] text-[#8a6240]">
              KAMURADO RESERVE
            </div>

            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <h1
                  className="mb-4 text-[42px] font-bold leading-[1.2] text-[#221a14] sm:text-[54px]"
                  style={{ wordBreak: "keep-all" }}
                >
                  かむらど
                  <br />
                  お弁当ご予約ページ
                </h1>

                <p className="max-w-2xl text-[18px] leading-[1.95] text-[#6d6258] sm:text-[19px]">
                  和の落ち着きを感じる、やさしい予約画面を目指しました。
                  お受け取り日時を選び、お名前とお電話番号を入力するだけでご予約いただけます。
                </p>
              </div>

              <div className="rounded-[28px] border border-[#e3ceb0] bg-[linear-gradient(135deg,#f5e6cf,#efe0c7)] p-5 shadow-[0_10px_26px_rgba(120,84,44,0.08)] sm:p-6">
                <div className="mb-3 inline-flex rounded-full bg-[#8b5d34] px-3 py-1 text-[13px] font-semibold tracking-[0.14em] text-white">
                  ご案内
                </div>

                <div className="space-y-3 text-[15px] leading-[1.9] text-[#5e5348]">
                  <p>当ページからお弁当のご予約ができます。</p>
                  <p>数量変更や追加注文もカート内で調整できます。</p>
                  <p>ご予約完了後は受付番号が表示されます。</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/reserve/menu"
                className="inline-flex min-h-[64px] items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#8b5d34,#9f7248)] px-6 py-4 text-center text-[24px] font-bold text-white shadow-[0_12px_28px_rgba(139,93,52,0.25)] transition hover:opacity-95"
              >
                ご予約をはじめる
              </Link>

              <a
                href="#guide"
                className="inline-flex min-h-[64px] items-center justify-center rounded-[22px] border border-[#d7c09c] bg-[linear-gradient(180deg,#fffdfa,#f8f1e5)] px-6 py-4 text-center text-[24px] font-bold text-[#3f3125] shadow-[0_8px_22px_rgba(88,63,39,0.06)] transition hover:bg-[#f8f3eb]"
              >
                ご利用案内を見る
              </a>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <section className="mb-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-[34px] font-bold leading-tight text-[#2c221b] sm:text-[40px]">
                  RESERVATION FLOW
                </h2>
                <div className="hidden rounded-full border border-[#e2cba8] bg-[#f3e5cf] px-4 py-2 text-[13px] font-semibold tracking-[0.14em] text-[#8a6240] sm:block">
                  4 STEPS
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FLOW_STEPS.map((item) => (
                  <article
                    key={item.step}
                    className={`rounded-[26px] border p-5 shadow-[0_8px_26px_rgba(88,63,39,0.05)] ${item.tone}`}
                  >
                    <div className="mb-3 inline-flex rounded-full bg-[#f0dfc7] px-3 py-1 text-[13px] font-semibold tracking-[0.14em] text-[#8a6240]">
                      {item.step}
                    </div>
                    <h3 className="mb-3 text-[28px] font-bold leading-[1.35] text-[#2a211b]">
                      {item.title}
                    </h3>
                    <p className="text-[16px] leading-[1.9] text-[#6a6056]">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section id="guide" className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[26px] border border-[#ead7b7] bg-[linear-gradient(180deg,#fffdfa,#fbf2e4)] p-5 shadow-[0_8px_24px_rgba(88,63,39,0.05)]">
                <div className="mb-3 inline-flex rounded-full bg-[#f1e0c8] px-3 py-1 text-[13px] font-semibold tracking-[0.14em] text-[#8a6240]">
                  GUIDE
                </div>
                <h3 className="mb-3 text-[28px] font-bold text-[#2a211b]">
                  ご利用案内
                </h3>
                <ul className="space-y-3 text-[16px] leading-[1.9] text-[#655a50]">
                  <li>・メニュー画面から数量の追加・調整ができます。</li>
                  <li>・受取日時とお客様情報をご入力のうえご予約ください。</li>
                  <li>・内容確認後、受付番号が発行されます。</li>
                </ul>
              </article>

              <article className="rounded-[26px] border border-[#e8d4b2] bg-[linear-gradient(180deg,#fffdf9,#f8efe0)] p-5 shadow-[0_8px_24px_rgba(88,63,39,0.05)]">
                <div className="mb-3 inline-flex rounded-full bg-[#f3e3cd] px-3 py-1 text-[13px] font-semibold tracking-[0.14em] text-[#8a6240]">
                  INFO
                </div>
                <h3 className="mb-3 text-[28px] font-bold text-[#2a211b]">
                  ご予約前に
                </h3>
                <ul className="space-y-3 text-[16px] leading-[1.9] text-[#655a50]">
                  <li>・混雑状況によりご希望時間の受付が難しい場合があります。</li>
                  <li>・内容変更は確定前の画面でご確認ください。</li>
                  <li>・数量が多いご注文はお早めのご予約がおすすめです。</li>
                </ul>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
