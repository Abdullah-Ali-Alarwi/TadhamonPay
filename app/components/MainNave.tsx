"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Tadhamonlogo from "@/public/tadhamonbankimage.png";

const links = [
  { href: "/", label: "إرسال حوالة", icon: "↗" },
  { href: "/receive", label: "استلام حوالات", icon: "↙" },
  { href: "/exchange", label: "مصارفة جزئية", icon: "⇄" },
  { href: "/cardless", label: "الاشتراك في الكارد لس", icon: "▣" },
];

export default function MainNave() {
  const pathname = usePathname();

  return (
    <header className="hidden w-full border-x-0 border-t-0 border-b border-white/15 bg-gradient-to-l from-sky-700 via-blue-800 to-blue-950 text-white shadow-lg lg:block">
      <div
        dir="rtl"
        className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-8 py-3"
      >
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src={Tadhamonlogo}
            alt="شعار بنك التضامن"
            priority
            className="h-auto w-24 rounded-lg"
          />
        </Link>

        <nav
          aria-label="التنقل بين الخدمات"
          className="flex items-center gap-1.5"
        >
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                  active
                    ? "bg-white text-blue-900 shadow-md"
                    : "text-blue-50 hover:bg-white/15"
                }`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-md text-sm ${
                    active
                      ? "bg-blue-100 text-blue-800"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {link.icon}
                </span>

                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
