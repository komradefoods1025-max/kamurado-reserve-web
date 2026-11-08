import Image from "next/image";
import Link from "next/link";
import styles from "./order.module.css";

const STEPS = [
  {
    title: "STEP 1｜商品を選ぶ",
    body: "スマホからお好きな商品を選択してください。",
  },
  {
    title: "STEP 2｜注文内容を確認",
    body: "ご注文の商品・数量・金額をご確認ください。",
  },
  {
    title: "STEP 3｜お客様情報を入力",
    body: "お名前・電話番号を入力して注文を確定してください。",
  },
  {
    title: "STEP 4｜店頭でお支払い・お受け取り",
    body: "ご指定の時間にご来店いただき、店頭でお支払い・商品をお受け取りください。",
  },
] as const;

export default function StoreOrderLandingPage() {
  return (
    <main className={`${styles.page} ${styles.landingPage}`}>
      <div className={styles.landingHeroWrap}>
        <Image
          src="/store-order/mobile-order-hero.png?v=20261109-new"
          alt="鉄板焼きダイニングかむらど 店内モバイルオーダーのご案内"
          width={723}
          height={1024}
          priority
          sizes="(max-width: 520px) 100vw, 520px"
          className={styles.landingHeroImg}
        />
      </div>

      <section className={styles.landingFlow} aria-labelledby="landing-flow-title">
        <h2 id="landing-flow-title" className={styles.landingFlowTitle}>
          📱 モバイルオーダー ご注文の流れ
        </h2>

        <ol className={styles.landingSteps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.landingStep}>
              <p className={styles.landingStepTitle}>{step.title}</p>
              <p className={styles.landingStepBody}>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className={styles.landingHighlight}>
          <p className={styles.landingHighlightLead}>
            ⏰ 事前注文で待ち時間を短縮！
          </p>
          <p className={styles.landingHighlightBody}>
            スマホで簡単注文！
            <br />
            店頭で待つことなく、スムーズにお受け取りいただけます！
          </p>
        </div>

        <p className={styles.landingDisclaimer}>
          ※ご注文が混み合っている場合、お受け取り時間が前後する可能性がございます。あらかじめご了承ください🙇‍♂️
        </p>
      </section>

      <div className={styles.footerBar}>
        <Link href="/order/menu" className={styles.landingMenuBtn}>
          商品ページはコチラ
        </Link>
      </div>
    </main>
  );
}
