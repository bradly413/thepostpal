import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Playfair_Display } from "next/font/google";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Logo / marketing display — alias kept for existing CSS references */
const playfair = Instrument_Serif({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Post less. Sell more.`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "A calm social-media tool for businesses that don't want one. Your week is drafted.",
  alternates: { canonical: "./" },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Post less. Sell more.`,
    description:
      "A calm social-media tool for businesses that don't want one. Your week is drafted.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${playfairDisplay.variable} ${instrumentSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "Posterboy Social",
                  url: SITE_URL,
                  logo: `${SITE_URL}/opengraph-image`,
                  email: "hello@posterboysocial.com",
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Posterboy",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  description:
                    "A calm social-media tool for businesses that don't want one. Posterboy creates, schedules, and publishes posts in your brand voice.",
                  offers: [
                    { "@type": "Offer", name: "Solo", price: "99", priceCurrency: "USD" },
                    { "@type": "Offer", name: "Command", price: "249", priceCurrency: "USD" },
                  ],
                },
              ],
            }),
          }}
        />{children}</body>
    </html>
  );
}
