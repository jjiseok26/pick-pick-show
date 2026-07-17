import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "\uC624\uB298\uC758 \uBC1C\uD45C\uC790\uB294? | PICK! PICK! SHOW";
const description = "\uB300\uD615 \uBC84\uC800\uB97C \uB204\uB974\uACE0, \uAE34\uC7A5\uAC10 \uB118\uCE58\uB294 \uCE74\uC6B4\uD2B8\uB2E4\uC6B4\uC73C\uB85C \uC624\uB298\uC758 \uBC1C\uD45C\uC790\uB97C \uACF5\uC815\uD558\uAC8C \uBF51\uC544\uBCF4\uC138\uC694.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, images: [{ url: image, width: 1672, height: 941 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
