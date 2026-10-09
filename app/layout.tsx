import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Echo | Case companion", description: "A digital companion for your live case experience." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
