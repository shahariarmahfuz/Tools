"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Braces, KeyRound, Link2, QrCode, Radio } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TOOLS_CATALOG } from "@/lib/tools";

const ICON_MAP: Record<string, React.ReactNode> = {
  "live-text": <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "qr-generator": <QrCode className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
  "link-fixer": <Link2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
  "json-formatter": <Braces className="h-4 w-4 text-[var(--text-muted)]" />,
  "base64-codec": <KeyRound className="h-4 w-4 text-[var(--text-muted)]" />,
};

export default function HomePage() {
  return (
    <AppShell
      title="Overview"
      subtitle="Developer & Cloud Utilities"
      headerRight={
        <Link
          href="/tools/live-text"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
        >
          Open Live Text
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <section className="border-b border-[var(--border-subtle)] pb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>Open Workspace • Neon PostgreSQL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Utility Workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)] leading-relaxed">
            Fast, zero-login utilities built for everyday Cloud VM and development workflows. Pick a
            tool from the side menu or launch one below.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Tools Directory
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOOLS_CATALOG.map((tool) => {
              const isLive = tool.status === "live";
              return isLive ? (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)]">
                          {ICON_MAP[tool.id]}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--text-main)] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                            {tool.name}
                          </h3>
                          <p className="text-[11px] text-[var(--text-muted)]">{tool.category}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      Active
                    </span>
                    <span className="font-mono text-[var(--text-muted)]">{tool.href}</span>
                  </div>
                </Link>
              ) : (
                <div
                  key={tool.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-5 flex flex-col justify-between opacity-75"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                          {ICON_MAP[tool.id]}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                            {tool.name}
                          </h3>
                          <p className="text-[11px] text-[var(--text-muted)]">{tool.category}</p>
                        </div>
                      </div>
                      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        Planned
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
