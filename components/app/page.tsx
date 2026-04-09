import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-800">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center">
            <p className="text-sm tracking-[0.3em] text-amber-700">
              KAMURADO RESERVE
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              かむらど
              <br />
              お弁当ご予約ページ
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
              和の落ち着きを感じる、やさしい予約画面を目指しました。
              お受け取り日時を選び、お名前とお電話番号を入力するだけで
              ご予約いただけます。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reserve/menu"
                className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                ご予約をはじめる
              </Link>

              <a
                href="#guide"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                ご利用案内を見る
              </a>
            </div>

            <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                LINEからもご予約ページを開ける仕様に対応予定です。
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                今後は、リッチメニューからこのWeb予約ページへ移動できる形に
                つなげていきます。
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-amber-100 via-white to-stone-100 p-6 sm:p-8">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-6 backdrop-blur">
                  <p className="text-sm tracking-[0.25em] text-stone-500">
                    RESERVATION FLOW
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">STEP 1</p>
                      <p className="mt-1 font-semibold">メニューを選ぶ</p>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">STEP 2</p>
                      <p className="mt-1 font-semibold">受取日時を選ぶ</p>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-sm text-stone-500">STEP 3</p>
                      <p className="mt-1 font-semibold">お名前・電話番号を入力</p>
                    </div>

                    <div className="rounded-2xl bg-amber-900 p-4 text-white">
                      <p className="text-sm text-amber-100">STEP 4</p>
                      <p className="mt-1 font-semibold">予約確定</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600">
                    予約確認は、今後
                    <span className="mx-1 font-semibold text-stone-800">
                      電話番号だけ
                    </span>
                    でできる形に整えていきます。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="guide" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold">ご利用案内</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <h3 className="text-base font-semibold">受取時間</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                営業時間内で受取時間を選択できる仕様です。
                当日予約にも対応しやすい形で調整していきます。
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <h3 className="text-base font-semibold">ご予約方法</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                メニュー選択後、受取日時とお客様情報をご入力ください。
                操作はシンプルに、見やすく整えていきます。
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <h3 className="text-base font-semibold">確認方法</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                予約確認は電話番号だけで照会できる導線を追加予定です。
                LINE連携も残したまま運用できるように進めます。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
