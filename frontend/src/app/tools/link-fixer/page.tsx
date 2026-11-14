"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Link2,
  QrCode,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type FixMode = "single" | "extract";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
]);

const SAMPLE_DIRTY_SINGLE = `│  https://deutsche-fifteen-off-
   bits.trycloudflare.com/tools/
   live-text?room=prod-vm&mode=
   sync  │`;

const SAMPLE_DIRTY_LOG = `2026-11-14 INFO Connector started
Preview URL: "https://api.example.com/v1/auth/callback?code=xyz123&utm_source=cli"
Webhook: http://10.0.2.15:8000/api/tools/live-text/endpoints/live/raw`;

function stripAnsiAndBorders(input: string): string {
  let out = input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
  out = out.replace(/[│┃┆┇┊┋|┌┐└┘├┤┬┴┼─━]+/g, " ");
  return out;
}

function cleanSingleUrl(
  raw: string,
  opts: { ensureHttps: boolean; stripTracking: boolean; decodeUrl: boolean }
): string {
  let text = stripAnsiAndBorders(raw).trim();
  if (!text) return "";

  text = text.replace(/^["'`<\[\(]+/, "").replace(/["'`>\]\),.;]+$/, "");
  text = text.replace(/\s+/g, "");
  text = text.replace(/^["'`<\[\(]+/, "").replace(/["'`>\]\),.;]+$/, "");

  if (!text) return "";

  if (opts.ensureHttps && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) {
    text = `https://${text}`;
  }

  if (opts.stripTracking) {
    try {
      const parsed = new URL(text);
      for (const key of Array.from(parsed.searchParams.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          parsed.searchParams.delete(key);
        }
      }
      text = parsed.toString();
    } catch {
      // keep string as-is
    }
  }

  if (opts.decodeUrl) {
    try {
      text = decodeURI(text);
    } catch {
      // ignore malformed URI sequences
    }
  }

  return text;
}

function extractUrls(
  raw: string,
  opts: { stripTracking: boolean; decodeUrl: boolean }
): string[] {
  const cleaned = stripAnsiAndBorders(raw);
  const matches = cleaned.match(/https?:\/\/[^\s"'<>\]\)]+/gi) || [];
  const unique: string[] = [];
  const seen = new Set<string>();

  for (let item of matches) {
    item = item.replace(/[.,;:!?]+$/, "");
    if (opts.stripTracking) {
      try {
        const parsed = new URL(item);
        for (const key of Array.from(parsed.searchParams.keys())) {
          if (TRACKING_PARAMS.has(key.toLowerCase())) {
            parsed.searchParams.delete(key);
          }
        }
        item = parsed.toString();
      } catch {
        // ignore
      }
    }
    if (opts.decodeUrl) {
      try {
        item = decodeURI(item);
      } catch {
        // ignore
      }
    }
    if (item && !seen.has(item)) {
      seen.add(item);
      unique.push(item);
    }
  }

  return unique;
}

export default function LinkFixerPage() {
  const [rawInput, setRawInput] = useState("");
  const [mode, setMode] = useState<FixMode>("single");
  const [ensureHttps, setEnsureHttps] = useState(true);
  const [stripTracking, setStripTracking] = useState(false);
  const [decodeUrl, setDecodeUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const singleResult = useMemo(() => {
    if (mode !== "single") return "";
    return cleanSingleUrl(rawInput, { ensureHttps, stripTracking, decodeUrl });
  }, [mode, rawInput, ensureHttps, stripTracking, decodeUrl]);

  const extractedResults = useMemo(() => {
    if (mode !== "extract") return [];
    return extractUrls(rawInput, { stripTracking, decodeUrl });
  }, [mode, rawInput, stripTracking, decodeUrl]);

  const parsedSingleUrl = useMemo(() => {
    if (!singleResult) return null;
    try {
      const u = new URL(singleResult);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u;
    } catch {
      return null;
    }
  }, [singleResult]);

  async function handleCopy(key: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  }

  async function handlePasteAndFix() {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) {
        setPasteNotice("Clipboard is empty");
        setTimeout(() => setPasteNotice(null), 1800);
        return;
      }
      setRawInput(clip);
    } catch {
      setPasteNotice("Browser blocked clipboard read — paste with Ctrl+V");
      setTimeout(() => setPasteNotice(null), 2200);
    }
  }

  return (
    <AppShell
      title="Link Fixer"
      subtitle="Clean broken URLs"
      headerRight={
        <button
          type="button"
          onClick={() => {
            setRawInput(mode === "single" ? SAMPLE_DIRTY_SINGLE : SAMPLE_DIRTY_LOG);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          Load Example
        </button>
      }
    >
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 lg:px-8 space-y-5">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:px-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-surface-2)] p-1 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === "single"
                  ? "bg-blue-600 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Fix Broken Single Link
            </button>
            <button
              type="button"
              onClick={() => setMode("extract")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === "extract"
                  ? "bg-blue-600 text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Extract Links from Logs
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            {mode === "single" && (
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ensureHttps}
                  onChange={(e) => setEnsureHttps(e.target.checked)}
                  className="rounded border-[var(--border-main)] accent-blue-600"
                />
                Auto https://
              </label>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stripTracking}
                onChange={(e) => setStripTracking(e.target.checked)}
                className="rounded border-[var(--border-main)] accent-blue-600"
              />
              Strip tracking (utm/fbclid)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={decodeUrl}
                onChange={(e) => setDecodeUrl(e.target.checked)}
                className="rounded border-[var(--border-main)] accent-blue-600"
              />
              Decode %20
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden flex flex-col shadow-md">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Messy / Terminal-Copied Input
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteAndFix}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <ClipboardPaste className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                  Paste & Fix
                </button>
                {rawInput && (
                  <button
                    type="button"
                    onClick={() => setRawInput("")}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {pasteNotice && (
              <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-4 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                {pasteNotice}
              </div>
            )}

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={
                mode === "single"
                  ? "টার্মিনাল থেকে কপি করা ভাঙা বা স্পেসওয়ালা লিংক এখানে পেস্ট করুন...\n\nExample:\nhttps://example.com/\n  very-long-path/\n  with-spaces"
                  : "টার্মিনাল লগ বা অনেকগুলো টেক্সট পেস্ট করুন — সব লিংক আলাদা করে বের করে দেবে..."
              }
              spellCheck={false}
              className="w-full flex-1 min-h-[240px] sm:min-h-[290px] resize-y bg-[var(--bg-input)] p-4 text-xs sm:text-[13px] font-mono leading-relaxed text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          <div className="lg:col-span-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden flex flex-col shadow-md">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {mode === "single"
                  ? "Fixed Link"
                  : `Extracted Links (${extractedResults.length})`}
              </span>

              {mode === "single" ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!singleResult}
                    onClick={() => handleCopy("single", singleResult)}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
                  >
                    {copiedKey === "single" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedKey === "single" ? "Copied" : "Copy"}
                  </button>
                  {parsedSingleUrl && (
                    <a
                      href={parsedSingleUrl.toString()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={extractedResults.length === 0}
                  onClick={() => handleCopy("all", extractedResults.join("\n"))}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
                >
                  {copiedKey === "all" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy All
                </button>
              )}
            </div>

            <div className="flex-1 bg-[var(--bg-input)] p-4 flex flex-col justify-between min-h-[240px] sm:min-h-[290px]">
              {mode === "single" ? (
                singleResult ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs sm:text-sm font-mono text-emerald-700 dark:text-emerald-300 break-all select-all">
                      {singleResult}
                    </div>

                    {parsedSingleUrl ? (
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)] text-xs">
                        <div className="px-3 py-2 flex items-center justify-between gap-3">
                          <span className="text-[var(--text-muted)]">Host</span>
                          <span className="font-mono text-blue-600 dark:text-blue-300 truncate">
                            {parsedSingleUrl.host}
                          </span>
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between gap-3">
                          <span className="text-[var(--text-muted)]">Path</span>
                          <span className="font-mono text-[var(--text-secondary)] truncate">
                            {parsedSingleUrl.pathname}
                          </span>
                        </div>
                        {Array.from(parsedSingleUrl.searchParams.entries()).length > 0 && (
                          <div className="px-3 py-2">
                            <div className="text-[var(--text-muted)] mb-1.5">Query Params</div>
                            <div className="space-y-1">
                              {Array.from(parsedSingleUrl.searchParams.entries()).map(
                                ([k, v], idx) => (
                                  <div
                                    key={`${k}-${idx}`}
                                    className="flex items-center justify-between gap-2 font-mono text-[11px]"
                                  >
                                    <span className="text-cyan-600 dark:text-cyan-400">{k}</span>
                                    <span className="text-[var(--text-main)] truncate max-w-[65%]">
                                      {v}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        Cleaned spaces/newlines, though this does not look like a standard HTTP/HTTPS
                        URL.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)]">
                    <Link2 className="h-7 w-7 mb-2 opacity-40" />
                    Fixed URL will appear here automatically.
                  </div>
                )
              ) : extractedResults.length > 0 ? (
                <div className="space-y-2 overflow-y-auto max-h-[260px]">
                  {extractedResults.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all">
                        {url}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(`item-${idx}`, url)}
                          className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2 text-[11px] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                        >
                          {copiedKey === `item-${idx}` ? (
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)]">
                  <Link2 className="h-7 w-7 mb-2 opacity-40" />
                  Paste terminal logs or text containing URLs.
                </div>
              )}

              {mode === "single" && parsedSingleUrl && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{singleResult.length} chars</span>
                  <Link
                    href="/tools/qr-generator"
                    className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300 hover:underline"
                  >
                    <QrCode className="h-3 w-3" />
                    QR Studio
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
