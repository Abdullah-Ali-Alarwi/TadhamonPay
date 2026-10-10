"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Tadhamonlogo from "@/public/tadhamonbankimage.png";
import Image from "next/image";

const links = [
  { href: "/", label: "إرسال حوالة", icon: "↗" },
  { href: "/receive", label: "استلام حوالات", icon: "↙" },
  { href: "/exchange", label: "مصارفة جزئية", icon: "⇄" },
  { href: "/cardless", label: "الكارد لس", icon: "▣" },
];

export default function SmallScreenNave() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const activeLink = links.find((link) => link.href === pathname);

  return (
    <header
      dir="rtl"
      className="relative w-full bg-gradient-to-l from-sky-700 via-blue-800 to-blue-950 text-white shadow-lg lg:hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <span>
          <Image
            className="rounded-2xl border w-25 border-white/20 "
            src={Tadhamonlogo}
            alt="Tadhamon Bank Logo"
          />
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-services-menu"
          className="flex min-w-36 items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-medium transition hover:bg-white/15"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{activeLink?.icon ?? "☰"}</span>
            <span>{activeLink?.label ?? "الخدمات"}</span>
          </span>

          <span
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
      </div>

      {isOpen && (
        <nav
          id="mobile-services-menu"
          aria-label="التنقل بين الخدمات"
          className="absolute inset-x-4 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 text-blue-950 shadow-xl"
        >
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-800">
                  {link.icon}
                </span>
                {link.label}
                {active && (
                  <span className="mr-auto text-blue-700" aria-hidden="true">
                    ✓
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
