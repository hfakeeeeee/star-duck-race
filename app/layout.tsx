import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "STAR Duck Race · Cùng nhau về đích",
  description: "Cuộc đua vịt của STAR Education. Tham gia bằng PIN và cùng cổ vũ.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
