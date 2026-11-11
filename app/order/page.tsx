import Link from "next/link";
import {
  STORE_ORDER_LANDING_SECTIONS,
  STORE_ORDER_LANDING_SHOW_TEXT_STEPS,
} from "../../lib/storeOrderLandingContent";
import StoreOrderLandingSections from "./StoreOrderLandingSections";
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
    title: "STEP 4｜お席へお届け・レジでお会計",
    body: "ご注文のお料理・ドリンクをお席へお持ちします。お会計はレジにてお願いします。",
  },
] as const;

export default function StoreOrderLandingPage() {
  return (
    <main className={`${styles.page} ${styles.landingPage}`}>
      <StoreOrderLandingSections sections={STORE_ORDER_LANDING_SECTIONS} />

      {STORE_ORDER_LANDING_SHOW_TEXT_STEPS ? (
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
        </section>
      ) : null}

      <div className={`${styles.footerBar} ${styles.landingFooterBar}`}>
        <Link href="/order/menu" className={styles.landingMenuBtn}>
          商品ページはコチラ
        </Link>
        <Link href="/order/check" className={styles.landingCheckBtn}>
          予約確認
        </Link>
      </div>
    </main>
  );
}
