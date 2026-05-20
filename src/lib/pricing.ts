export const BASE_BEAT_LEASE_PRICE = 40;
export const BASE_BEAT_LEASE_PRICE_CENTS = BASE_BEAT_LEASE_PRICE * 100;

export function getBeatLeasePrice(value: number | null | undefined) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : BASE_BEAT_LEASE_PRICE;
}

export function getBeatLeasePriceCents(value: number | null | undefined) {
  return Math.round(getBeatLeasePrice(value) * 100);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value);
}
