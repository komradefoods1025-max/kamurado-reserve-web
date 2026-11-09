import Image from "next/image";
import type { StoreOrderLandingSection } from "../../lib/storeOrderLandingContent";
import styles from "./order.module.css";

export default function StoreOrderLandingSections({
  sections,
  presentation = "landing",
}: {
  sections: StoreOrderLandingSection[];
  /** menu = 枠なし・商品画像並みの大きさ */
  presentation?: "landing" | "menu";
}) {
  const isMenu = presentation === "menu";
  return (
    <>
      {sections.map((section, index) => {
        if (section.kind === "image") {
          return (
            <div key={`img-${index}`} className={styles.landingHeroWrap}>
              <Image
                src={section.src}
                alt={section.alt}
                width={section.width}
                height={section.height}
                priority={index === 0}
                sizes="(max-width: 520px) 100vw, 520px"
                className={styles.landingHeroImg}
              />
            </div>
          );
        }

        if (section.kind === "video" && section.src.trim()) {
          const autoplay = section.autoplay ?? false;
          const loop = section.loop ?? false;
          const muted = section.muted ?? autoplay;
          const controls = section.controls ?? !autoplay;

          return (
            <section
              key={`vid-${index}`}
              className={
                isMenu
                  ? styles.menuPromoVideoSection
                  : styles.landingVideoSection
              }
              aria-label={section.title || "動画"}
            >
              {section.title ? (
                <h2 className={styles.landingVideoTitle}>{section.title}</h2>
              ) : null}
              <div
                className={
                  isMenu ? styles.menuPromoVideoWrap : styles.landingVideoWrap
                }
                style={
                  isMenu && section.menuAspectRatio
                    ? { aspectRatio: section.menuAspectRatio }
                    : undefined
                }
              >
                <video
                  className={
                    isMenu ? styles.menuPromoVideo : styles.landingVideo
                  }
                  autoPlay={autoplay}
                  loop={loop}
                  muted={muted}
                  controls={controls}
                  playsInline
                  preload={autoplay ? "auto" : "metadata"}
                  poster={
                    autoplay ? undefined : section.poster || undefined
                  }
                >
                  <source src={section.src} type="video/mp4" />
                </video>
              </div>
              {isMenu && section.menuCaption ? (
                <p className={styles.menuPromoCaption}>{section.menuCaption}</p>
              ) : null}
            </section>
          );
        }

        if (section.kind === "youtube" && section.videoId.trim()) {
          const embed = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(section.videoId)}`;
          return (
            <section
              key={`yt-${index}`}
              className={styles.landingVideoSection}
              aria-label={section.title || "動画"}
            >
              {section.title ? (
                <h2 className={styles.landingVideoTitle}>{section.title}</h2>
              ) : null}
              <div className={styles.landingVideoWrap}>
                <iframe
                  className={styles.landingVideoIframe}
                  src={embed}
                  title={section.title || "YouTube動画"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </section>
          );
        }

        return null;
      })}
    </>
  );
}
