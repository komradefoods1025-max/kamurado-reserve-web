"use client";

import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import {
  ORDER_RECEIVED_NAV_DELAY_MS,
  playOrderReceivedNavigationSound,
} from "../lib/premiumSounds";

type StartReservationButtonProps = {
  href?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export default function StartReservationButton({
  href = "/menu",
  className,
  style,
  children,
}: StartReservationButtonProps) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isNavigatingRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    setIsNavigating(true);

    void playOrderReceivedNavigationSound();

    window.setTimeout(() => {
      router.push(href);
    }, ORDER_RECEIVED_NAV_DELAY_MS);
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={handleClick}
      disabled={isNavigating}
      aria-disabled={isNavigating}
    >
      {children}
    </button>
  );
}
