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
          width={935}
          height={1024}
          priority
          sizes="(max-width: 520px) 100vw, 520px"
          className={styles.landingHeroImg}
        />
      </div>

      <div className={styles.footerBar}>
        <Link href="/order/menu" className={styles.landingMenuBtn}>
          商品ページはコチラ
        </Link>
      </div>
    </main>
  );
}
