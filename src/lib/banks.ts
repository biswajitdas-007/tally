/**
 * Recognisable brand-coloured monograms for common Indian banks. These are our
 * own coloured badges (a short code on the bank's brand colour) — not the banks'
 * logo artwork — so they render offline and carry no logo files.
 */
export interface BankBrand {
  short: string;
  color: string;
}

const BANKS: { keywords: string[]; short: string; color: string }[] = [
  { keywords: ["hdfc"], short: "HDFC", color: "#004C8F" },
  { keywords: ["icici"], short: "ICICI", color: "#AE282E" },
  { keywords: ["state bank", "sbi"], short: "SBI", color: "#22409A" },
  { keywords: ["axis"], short: "AXIS", color: "#97144D" },
  { keywords: ["kotak"], short: "KMB", color: "#003874" },
  { keywords: ["bandhan"], short: "BDN", color: "#E31E24" },
  { keywords: ["bank of baroda", "baroda", "bob"], short: "BOB", color: "#F26522" },
  { keywords: ["punjab national", "pnb"], short: "PNB", color: "#A6192E" },
  { keywords: ["yes bank"], short: "YES", color: "#00518F" },
  { keywords: ["idfc"], short: "IDFC", color: "#9C1D26" },
  { keywords: ["indusind"], short: "IIB", color: "#9E1B32" },
  { keywords: ["federal"], short: "FED", color: "#004B8D" },
  { keywords: ["au small", "au bank"], short: "AU", color: "#5B2D8E" },
  { keywords: ["idbi"], short: "IDBI", color: "#006A4D" },
  { keywords: ["canara"], short: "CNRA", color: "#00539B" },
  { keywords: ["union bank"], short: "UBI", color: "#C8102E" },
  { keywords: ["rbl"], short: "RBL", color: "#8A1538" },
  { keywords: ["indian bank"], short: "IB", color: "#00477B" },
  { keywords: ["central bank"], short: "CBI", color: "#7A1F2B" },
];

/** Detect a known bank from a free-text name/lender. Returns null if none. */
export function bankBrand(text?: string): BankBrand | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const b of BANKS) {
    if (b.keywords.some((k) => t.includes(k))) return { short: b.short, color: b.color };
  }
  return null;
}
