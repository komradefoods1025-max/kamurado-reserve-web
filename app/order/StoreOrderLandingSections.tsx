import Image from "next/image";
import type { StoreOrderLandingSection } from "../../lib/storeOrderLandingContent";
import styles from "./order.module.css";

export default function StoreOrderLandingSections({
  sections,
}: {
  sections: StoreOrderLandingSection[];
}) {
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
          return (
            <section
              key={`vid-${index}`}
              className={styles.landingVideoSection}
              aria-label={section.title || "動画"}
            >
              {section.title ? (
                <h2 className={styles.landingVideoTitle}>{section.title}</h2>
              ) : null}
              <div className={styles.landingVideoWrap}>
                <video
                  className={styles.landingVideo}
                  controls
                  playsInline
                  preload="metadata"
                  poster={section.poster || undefined}
                >
                  <source src={section.src} type="video/mp4" />
                </video>
              </div>
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
