"use client";

import { type CSSProperties } from "react";
import styles from "./reservationCompleteCelebration.module.css";

const PARTICLES = [
  { x: "8%", y: "18%", size: 5, dx: "-12px", dy: "28px", delay: "0.2s", duration: "2.4s", peak: 0.55 },
  { x: "18%", y: "8%", size: 4, dx: "8px", dy: "34px", delay: "0.35s", duration: "2.2s", peak: 0.45 },
  { x: "28%", y: "22%", size: 6, dx: "-6px", dy: "42px", delay: "0.28s", duration: "2.6s", peak: 0.5 },
  { x: "38%", y: "10%", size: 4, dx: "4px", dy: "36px", delay: "0.42s", duration: "2.3s", peak: 0.42 },
  { x: "48%", y: "16%", size: 5, dx: "0px", dy: "44px", delay: "0.22s", duration: "2.5s", peak: 0.58 },
  { x: "58%", y: "6%", size: 4, dx: "-8px", dy: "32px", delay: "0.48s", duration: "2.1s", peak: 0.4 },
  { x: "68%", y: "20%", size: 5, dx: "10px", dy: "38px", delay: "0.32s", duration: "2.4s", peak: 0.48 },
  { x: "78%", y: "12%", size: 4, dx: "-4px", dy: "30px", delay: "0.55s", duration: "2.2s", peak: 0.38 },
  { x: "88%", y: "18%", size: 5, dx: "6px", dy: "40px", delay: "0.4s", duration: "2.5s", peak: 0.46 },
  { x: "14%", y: "32%", size: 3, dx: "-10px", dy: "24px", delay: "0.62s", duration: "2s", peak: 0.35 },
  { x: "42%", y: "28%", size: 3, dx: "6px", dy: "26px", delay: "0.58s", duration: "2.1s", peak: 0.32 },
  { x: "72%", y: "30%", size: 3, dx: "-6px", dy: "22px", delay: "0.66s", duration: "2s", peak: 0.34 },
] as const;

export default function ReservationCompleteCelebration() {
  return (
    <div className={styles.celebration}>
      <div className={styles.particles} aria-hidden="true">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className={styles.particle}
            style={
              {
                "--particle-x": particle.x,
                "--particle-y": particle.y,
                "--particle-size": `${particle.size}px`,
                "--particle-dx": particle.dx,
                "--particle-dy": particle.dy,
                "--particle-delay": particle.delay,
                "--particle-duration": particle.duration,
                "--particle-peak": particle.peak,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.checkmarkWrap}>
        <span className={styles.checkmark} aria-hidden="true">
          ✓
        </span>
      </div>

      <h1 className={styles.title}>ご予約ありがとうございます</h1>
    </div>
  );
}
