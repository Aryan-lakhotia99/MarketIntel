export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatChange(value: number, digits = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPrice(value: number, currency = "INR"): string {
  if (currency === "INR") {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
