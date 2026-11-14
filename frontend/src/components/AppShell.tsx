"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Braces,
  ChevronRight,
  Database,
  KeyRound,
  LayoutGrid,
  Link2,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Radio,
  Sun,
  Terminal,
  X,
} from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeMatch: (path: string) => boolean;
  live?: boolean;
  soon?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: <LayoutGrid className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />,
    activeMatch: (p) => p === "/",
  },
  {
    label: "Live Text Share",
    href: "/tools/live-text",
    icon: <Radio className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
    activeMatch: (p) => p.startsWith("/tools/live-text"),
    live: true,
  },
  {
    label: "QR Studio",
    href: "/tools/qr-generator",
    icon: <QrCode className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />,
    activeMatch: (p) => p.startsWith("/tools/qr-generator"),
    live: true,
  },
  {
    label: "Link Fixer",
    href: "/tools/link-fixer",
    icon: <Link2 className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />,
    activeMatch: (p) => p.startsWith("/tools/link-fixer"),
    live: true,
  },
];

const UPCOMING_NAV: NavItem[] = [
  {
    label: "JSON Formatter",
    href: "#",
    icon: <Braces className="h-4 w-4 shrink-0" />,
    activeMatch: () => false,
    soon: true,
  },
  {
    label: "Hash & Base64",
    href: "#",
    icon: <KeyRound className="h-4 w-4 shrink-0" />,
    activeMatch: () => false,
    soon: true,
  },
];

function SidebarContent({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between py-3.5">
      <div className="space-y-5 px-2.5">
        <div>
          {!collapsed && (
            <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Tools
            </div>
          )}
          <nav className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const active = item.activeMatch(pathname);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center ${
                    collapsed ? "justify-center px-0" : "justify-between px-2.5"
                  } h-9 rounded-lg text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-blue-500/15 text-blue-700 dark:text-white border border-blue-500/30 shadow-xs"
                      : "text-[var(--text-secondary)] border border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-[var(--text-main)]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && item.live && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"
                      title="Live"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {!collapsed ? (
            <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Roadmap
            </div>
          ) : (
            <div className="mx-2 border-t border-[var(--border-subtle)] pt-3" />
          )}
          <nav className="space-y-1">
            {UPCOMING_NAV.map((item) => (
              <div
                key={item.label}
                title={collapsed ? `${item.label} (Soon)` : undefined}
                className={`flex items-center ${
                  collapsed ? "justify-center px-0" : "justify-between px-2.5"
                } h-9 rounded-lg text-[13px] font-medium text-[var(--text-muted)] cursor-not-allowed select-none`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    Soon
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="px-2.5 pt-3 border-t border-[var(--border-subtle)]">
        <div
          title={collapsed ? "Neon PostgreSQL Connected" : undefined}
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2.5 px-2.5"
          } h-8 rounded-lg text-xs text-[var(--text-muted)]`}
        >
          <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {!collapsed && (
            <span className="truncate text-[11px] text-[var(--text-muted)]">
              Neon Postgres • Online
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ title, subtitle, headerRight, children }: AppShellProps) {
  const pathname = usePathname();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedRail = localStorage.getItem("toolbox_sidebar_collapsed");
    const currentDark = document.documentElement.classList.contains("dark");
    queueMicrotask(() => {
      if (savedRail === "1") setRailCollapsed(true);
      setIsDark(currentDark);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleDesktopRail() {
    setRailCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("toolbox_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("toolbox_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("toolbox_theme", "light");
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-main)] transition-colors">
      {/* Top Header: Logo on LEFT, Theme + Menu Button on RIGHT */}
      <header className="sticky top-0 z-40 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-md">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-5">
          {/* Left: Brand Logo + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 rounded-md py-0.5 hover:opacity-90 transition-opacity"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-[var(--text-main)] whitespace-nowrap">
                ToolBox
              </span>
            </Link>

            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-main)] truncate">
                {title}
              </span>
              {subtitle && (
                <span className="hidden md:inline-block rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-secondary)] truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right: Page Action + Theme Toggle + Menu Button */}
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-600" />
              )}
            </button>

            {/* Desktop Left Sidebar / Rail Toggle Button (Right Side of Header) */}
            <button
              type="button"
              onClick={toggleDesktopRail}
              aria-label={railCollapsed ? "Expand left side menu" : "Collapse left side menu"}
              title={railCollapsed ? "Expand left side menu" : "Collapse left side menu"}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
            >
              {railCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            {/* Mobile Menu Button (Right Side of Header, opens LEFT sidebar) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Body with LEFT Side Menu / Rail + Main Workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop LEFT Side Menu / Collapsible Rail */}
        <aside
          className={`hidden md:block shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] transition-all duration-200 ${
            railCollapsed ? "w-[60px]" : "w-[232px]"
          }`}
        >
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
            <SidebarContent collapsed={railCollapsed} pathname={pathname} />
          </div>
        </aside>

        {/* Mobile Slide-Over Side Menu (Menu button is RIGHT, Drawer opens from LEFT) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-start">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative z-10 w-[268px] max-w-[82vw] h-full border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex flex-col shadow-2xl">
              <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-main)]">ToolBox Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent
                  collapsed={false}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.06),transparent_60%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
