import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { themeScript } from "@/components/theme-provider";
import { Providers } from "./providers";

// Self-hosted (see ./fonts/README.md) so builds never depend on Google Fonts.
const instrumentSans = localFont({
  src: "./fonts/instrument-sans-variable.woff2",
  variable: "--font-sans",
  weight: "400 700",
  display: "swap",
});

const instrumentSerif = localFont({
  src: [
    { path: "./fonts/instrument-serif-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  // Only used for headline accents; not worth delaying first paint for.
  preload: false,
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  title: { default: "Tally — Split expenses, settle up over UPI", template: "%s · Tally" },
  description:
    "Split bills with friends, track who owes whom, and settle up instantly over UPI. A warm, fast expense app for India.",
  applicationName: "Tally",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Tally" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  openGraph: {
    title: "Tally",
    description: "Split expenses with friends, track who owes whom, and settle up over UPI.",
  },
  twitter: {
    card: "summary",
    title: "Tally",
    description: "Split expenses with friends, track who owes whom, and settle up over UPI.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b1f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
