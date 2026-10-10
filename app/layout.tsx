import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainNave from "@/app/components/MainNave";
import SmallScreenNave from "@/app/components/SmallScreenNave";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "بنك التضامن | الخدمات المالية",
  description: "والحوالات الخدمات المالية الإلكترونية لبنك التضامن",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="hidden lg:block">
          <MainNave />
        </div>

        <div className="block lg:hidden">
          <SmallScreenNave />
        </div>

        {children}
      </body>
    </html>
  );
}
