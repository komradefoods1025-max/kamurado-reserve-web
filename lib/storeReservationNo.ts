export function createStoreOrderReservationNo(): string {
  const now = new Date();
  const jst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(/[^\d]/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STO-${jst}-${rand}`;
}
