import Image from "next/image";
import Link from "next/link";
import styles from "./order.module.css";

export default function StoreOrderLandingPage() {
  return (
    <main className={`${styles.page} ${styles.landingPage}`}>
      <div className={styles.landingHeroWrap}>
        <Image
          src="/store-order/mobile-order-hero.png"
          alt="鉄板焼きダイニングかむらど 店内モバイルオーダーのご案内"
          fill
          priority
          sizes="100vw"
          className={styles.landingHeroImg}
        />
      </div>

      <div className={styles.landingFooter}>
        <Link href="/order/menu" className={styles.landingMenuBtn}>
          商品ページはコチラ
        </Link>
      </div>
    </main>
  );
}
