export function isGasDateBookingError(text: unknown): boolean {
  return String(text || "").includes("date is not available for booking");
}
