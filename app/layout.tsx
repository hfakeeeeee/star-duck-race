import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "../components/theme-provider";
import "../components/theme.css";
export const metadata: Metadata = {
  title: "STAR Duck Race · Cùng nhau về đích",
  description: "Cuộc đua vịt của STAR Education. Tham gia bằng PIN và cùng cổ vũ.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
