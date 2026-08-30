"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, Menu, Play, X } from "lucide-react";

export interface HeroNavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface HeroPartner {
  name: string;
  detail: string;
}

export interface ResponsiveHeroBannerProps {
  logoUrl: string;
  backgroundImageUrl: string;
  navLinks: HeroNavLink[];
  ctaButtonText: string;
  badgeLabel: string;
  badgeText: string;
  title: string;
  titleLine2: string;
  description: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  partnersTitle: string;
  partners: HeroPartner[];
  onCtaClick?: () => void;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export default function ResponsiveHeroBanner({
  logoUrl,
  backgroundImageUrl,
  navLinks,
  ctaButtonText,
  badgeLabel,
  badgeText,
  title,
  titleLine2,
  description,
  primaryButtonText,
  secondaryButtonText,
  partnersTitle,
  partners,
  onCtaClick,
  onPrimaryClick,
  onSecondaryClick,
}: ResponsiveHeroBannerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-black text-[#eaeaf0]" style={{ fontFamily: 'Nohemi, Arial, sans-serif' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(154,138,251,0.18),transparent_46%)]" />
        <div
          className="absolute inset-0 bg-no-repeat bg-top opacity-80"
          style={{
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundSize: "cover",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.82)_52%,rgba(0,0,0,1)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-[30px] pb-[54px] pt-[30px] sm:px-[48px] sm:pt-[44px] lg:px-[72px]">
        <header className="flex items-center justify-between gap-[30px]">
          <div className="flex items-center gap-[30px]">
            <a href="#home" aria-label="Murmur home" className="shrink-0">
              <img src={logoUrl} alt="Murmur" className="h-[24px] w-[24px] object-contain" />
            </a>

            <nav className="hidden items-center gap-[12px] md:flex" aria-label="Primary navigation">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={clsx(
                    "rounded-[999px] border px-[30px] py-[12px] text-[14px] font-medium transition-colors duration-300",
                    link.active
                      ? "border-[#9a8afb] bg-[#1e1c26] text-white"
                      : "border-white/10 bg-transparent text-[#eaeaf0] hover:border-[#9a8afb]/60 hover:text-white"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-[12px] md:flex">
            <button
              type="button"
              onClick={onCtaClick}
              className="rounded-[16px] bg-[#9a8afb] px-[30px] py-[12px] text-[14px] font-semibold text-black transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {ctaButtonText}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-[12px] border border-white/10 bg-[#1e1c26] p-[12px] text-[#eaeaf0] transition-colors duration-300 hover:border-[#9a8afb]/60 md:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-[24px] w-[24px]" /> : <Menu className="h-[24px] w-[24px]" />}
          </button>
        </header>

        {mobileMenuOpen ? (
          <div className="mt-[30px] rounded-[20px] border border-white/10 bg-[#1e1c26] p-[30px] md:hidden">
            <div className="grid gap-[12px]">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={clsx(
                    "rounded-[12px] border px-[30px] py-[12px] text-[14px] font-medium transition-colors duration-300",
                    link.active
                      ? "border-[#9a8afb] bg-black text-white"
                      : "border-white/10 text-[#eaeaf0] hover:border-[#9a8afb]/60 hover:text-white"
                  )}
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={onCtaClick}
                className="rounded-[12px] bg-[#9a8afb] px-[30px] py-[12px] text-[14px] font-semibold text-black transition-transform duration-300 active:scale-[0.98]"
              >
                {ctaButtonText}
              </button>
            </div>
          </div>
        ) : null}

        <div className="relative mt-[72px] max-w-4xl lg:mt-[88px]">
          <div className="inline-flex items-center gap-[12px] rounded-[999px] border border-white/10 bg-[#1e1c26] px-[30px] py-[12px] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <span className="rounded-[999px] bg-[#9a8afb] px-[12px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.24em] text-black">
              {badgeLabel}
            </span>
            <span className="text-[14px] font-medium text-[#eaeaf0]">{badgeText}</span>
          </div>

          <div className="pointer-events-none absolute -left-[30px] top-[30px] hidden h-[220px] w-[520px] lg:block">
            <svg viewBox="0 0 520 220" className="h-full w-full" aria-hidden="true" role="presentation">
              <path
                d="M20 160 C132 20, 286 18, 500 52"
                fill="none"
                stroke="rgba(154,138,251,0.38)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M30 168 C142 34, 296 30, 492 60"
                fill="none"
                stroke="rgba(154,138,251,0.16)"
                strokeWidth="14"
                strokeLinecap="round"
                filter="blur(2px)"
              />
            </svg>
          </div>

          <h1 className="relative mt-[44px] max-w-4xl text-[clamp(3.5rem,9vw,7rem)] font-bold tracking-[-0.04em] text-white leading-[0.94]">
            {title}
          </h1>
          <h2 className="mt-[12px] max-w-4xl text-[clamp(3.25rem,8.4vw,6.5rem)] font-bold tracking-[-0.04em] text-[#eaeaf0] leading-[0.94]">
            {titleLine2}
          </h2>

          <p className="mt-[30px] max-w-3xl text-[18px] leading-[1.7] text-[#c2bcd2]">
            {description}
          </p>

          <div className="mt-[44px] flex flex-wrap items-center gap-[30px]">
            <button
              type="button"
              onClick={onPrimaryClick}
              className="rounded-[16px] bg-[#9a8afb] px-[30px] py-[12px] text-[14px] font-semibold text-black transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {primaryButtonText}
            </button>

            <button
              type="button"
              onClick={onSecondaryClick}
              className="inline-flex items-center gap-[9px] text-[14px] font-medium text-[#eaeaf0] transition-colors duration-300 hover:text-white"
            >
              <Play className="h-[18px] w-[18px]" />
              <span>{secondaryButtonText}</span>
              <ArrowRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="mt-[72px] border-t border-white/10 pt-[30px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#a49db5]">
            {partnersTitle}
          </p>
          <div className="mt-[30px] grid gap-[30px] md:grid-cols-3">
            {partners.map((partner) => (
              <div key={partner.name} className="rounded-[16px] border border-white/10 bg-[#1e1c26] px-[30px] py-[30px]">
                <div className="text-[14px] font-semibold text-[#eaeaf0]">{partner.name}</div>
                <div className="mt-[12px] text-[14px] font-medium text-[#c2bcd2]">{partner.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
