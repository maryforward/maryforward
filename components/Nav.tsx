"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { RoleSelectionModal } from "@/components/auth/RoleSelectionModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Menu = { label: string; items: { label: string; href: string }[] };

function Dropdown({ menu }: { menu: Menu }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="rounded-2xl px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition inline-flex items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {menu.label} <span className="opacity-60 rotate-arrow">▾</span>
      </button>
      {open ? (
        <div className="absolute start-0 top-12 z-50 w-72 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-2">
          {menu.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full p-1 hover:bg-white/10 transition"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt=""
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-sm font-medium text-white">
            {initials}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-2">
          <div className="px-3 py-2 border-b border-white/10 mb-2">
            <p className="text-sm font-medium text-slate-50">{session?.user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
          </div>
          <Link
            href="/portal/dashboard"
            className="block rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
            onClick={() => setOpen(false)}
          >
            {t("common.dashboard")}
          </Link>
          <Link
            href="/portal/cases"
            className="block rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
            onClick={() => setOpen(false)}
          >
            {t("userMenu.myCases")}
          </Link>
          <Link
            href="/portal/trials"
            className="block rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
            onClick={() => setOpen(false)}
          >
            {t("userMenu.savedTrials")}
          </Link>
          <Link
            href="/portal/profile"
            className="block rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
            onClick={() => setOpen(false)}
          >
            {t("userMenu.profileSettings")}
          </Link>
          <div className="border-t border-white/10 mt-2 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full text-start rounded-xl px-3 py-2 text-red-400 hover:bg-red-500/10 transition"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const isLoading = status === "loading";
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "signup" }>({
    isOpen: false,
    mode: "login",
  });

  // Build menus with translations
  const menus: Menu[] = [
    {
      label: t("nav.learn"),
      items: [
        { label: t("nav.allAboutConditions"), href: "/learn" },
        { label: t("nav.oncology"), href: "/learn/oncology" },
        { label: t("nav.infectiousDisease"), href: "/learn/infectious" },
        { label: t("nav.ngsAndMolecular"), href: "/learn/ngs" },
        { label: t("nav.webinarsAndBriefings"), href: "/learn/webinars" },
      ],
    },
    {
      label: t("nav.whatWeDo"),
      items: [
        { label: t("nav.forPatients"), href: "/what-we-do/patients" },
        { label: t("nav.forClinicians"), href: "/what-we-do/clinicians" },
        { label: t("nav.forSponsors"), href: "/what-we-do/partners" },
        { label: t("nav.trialsNavigator"), href: "/trials" },
      ],
    },
    {
      label: t("nav.company"),
      items: [
        { label: t("nav.ourStory"), href: "/company/our-story" },
        { label: t("nav.compliance"), href: "/company/compliance" },
        { label: t("nav.pricing"), href: "/company/pricing" },
        { label: t("nav.contact"), href: "/contact" },
      ],
    },
  ];

  // Listen for custom events to open modal (for switching between login/signup)
  useEffect(() => {
    const handleOpenAuthModal = (e: CustomEvent<{ mode: "login" | "signup" }>) => {
      setAuthModal({ isOpen: true, mode: e.detail.mode });
    };

    window.addEventListener("openAuthModal", handleOpenAuthModal as EventListener);
    return () => {
      window.removeEventListener("openAuthModal", handleOpenAuthModal as EventListener);
    };
  }, []);

  const openLoginModal = () => setAuthModal({ isOpen: true, mode: "login" });
  const openSignupModal = () => setAuthModal({ isOpen: true, mode: "signup" });
  const closeModal = () => setAuthModal({ ...authModal, isOpen: false });

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="containerX py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              <Image src="/maryforward-logo.png" alt="MaryForward logo" width={36} height={36} priority />
            </div>
            <span>MaryForward</span>
          </Link>

          <nav className="hidden md:flex items-center gap-2" aria-label="Primary">
            {menus.map((m) => (
              <Dropdown key={m.label} menu={m} />
            ))}
            <Link className="rounded-2xl px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition" href="/resources">
              {t("nav.resources")}
            </Link>
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {isLoading ? (
              <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
            ) : session ? (
              <>
                <Link className="btn hidden sm:inline-flex" href="/portal/dashboard">
                  {t("common.dashboard")}
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <button className="btn" onClick={openLoginModal}>
                  {t("common.login")}
                </button>
                <button className="btn btnPrimary" onClick={openSignupModal}>
                  {t("common.signup")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <RoleSelectionModal
        isOpen={authModal.isOpen}
        onClose={closeModal}
        mode={authModal.mode}
      />
    </>
  );
}
