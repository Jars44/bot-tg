export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isRandomText(text: string): boolean {
  return (
    text.length >= 4 &&
    !text.includes(" ") &&
    !/^[0-9]+$/.test(text) &&
    (/[a-z]{6,}/i.test(text) || /(.)\\1{3,}/.test(text))
  );
}

const COUNTRY_FLAGS: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  AUD: "AU",
  CAD: "CA",
  NZD: "NZ",
  CNY: "CN",
  INR: "IN",
};

export function getCountryFlag(country: string): string {
  return COUNTRY_FLAGS[country.toUpperCase()] || country;
}
