import Link from "next/link";

const FLOW_STEPS = [
  {
    step: "STEP 1",
    title: "メニューを選ぶ",
    body: "お弁当・追加メニュー・ドリンクをお選びいただけます。",
  },
  {
    step: "STEP 2",
    title: "受取日時を選ぶ",
    body: "ご希望の日付と時間を選択してください。",
  },
  {
    step: "STEP 3",
    title: "お客様情報を入力",
    body: "お名前とお電話番号を入力して確認へ進みます。",
  },
  {
    step: "STEP 4",
    title: "予約を確定",
    body: "内容確認後、そのままご予約完了になります。",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f0e6] px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[32px] border border-[#e4d5bd] bg-[#fbf7ef] shadow-[0_16px_50px_rgba(88,63,39,0.08)]">
          <div className="border-b border-[#eadfcf] px-6 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
            <div className="mb-5 text-[15px] tracking-[0.18em] text-[#8a6240]">
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

              <div className="rounded-[28px] border border-[#eadfcf] bg-[linear-gradient(135deg,#f7efdf,#efe3cf)] p-5 sm:p-6">
                <div className="mb-3 text-[14px] font-semibold tracking-[0.16em] text-[#8a6240]">
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
                className="inline-flex min-h-[64px] items-center justify-center rounded-[22px] bg-[#8b5d34] px-6 py-4 text-center text-[24px] font-bold text-white shadow-[0_10px_24px_rgba(139,93,52,0.22)] transition hover:opacity-95"
              >
                ご予約をはじめる
              </Link>

              <a
                href="#guide"
                className="inline-flex min-h-[64px] items-center justify-center rounded-[22px] border border-[#d9c7aa] bg-white px-6 py-4 text-center text-[24px] font-bold text-[#3f3125] transition hover:bg-[#f8f3eb]"
              >
                ご利用案内を見る
              </a>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <section className="mb-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-[34px] font-bold leading-tight text-[#221a14] sm:text-[40px]">
                  RESERVATION FLOW
                </h2>
                <div className="hidden rounded-full bg-[#efe5d6] px-4 py-2 text-[13px] font-semibold tracking-[0.14em] text-[#8a6240] sm:block">
                  4 STEPS
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FLOW_STEPS.map((item) => (
                  <article
                    key={item.step}
                    className="rounded-[26px] border border-[#eadfcf] bg-white p-5 shadow-[0_8px_26px_rgba(88,63,39,0.05)]"
                  >
                    <div className="mb-3 text-[14px] font-semibold tracking-[0.14em] text-[#9a7a57]">
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
              <article className="rounded-[26px] border border-[#eadfcf] bg-[#fffdfa] p-5">
                <div className="mb-3 text-[14px] font-semibold tracking-[0.14em] text-[#9a7a57]">
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

              <article className="rounded-[26px] border border-[#eadfcf] bg-[#fffdfa] p-5">
                <div className="mb-3 text-[14px] font-semibold tracking-[0.14em] text-[#9a7a57]">
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
