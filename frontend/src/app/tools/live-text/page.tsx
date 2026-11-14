"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LiveTextEditor } from "@/components/LiveTextEditor";
import { apiFetch } from "@/lib/api";
import type { LiveEndpoint } from "@/lib/types";

export default function LiveTextDashboardPage() {
  const router = useRouter();

  const [jumpSlug, setJumpSlug] = useState("");
  const [endpoints, setEndpoints] = useState<LiveEndpoint[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch<{ endpoints: LiveEndpoint[] }>(
        "/api/tools/live-text/endpoints",
        {},
        null
      );
      setEndpoints(res.endpoints);
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        const res = await apiFetch<{ endpoints: LiveEndpoint[] }>(
          "/api/tools/live-text/endpoints",
          {},
          null
        );
        if (!cancelled) setEndpoints(res.endpoints);
      } catch {
        // ignore
      }
    }
    void loadRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const clean = jumpSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!clean) return;
    router.push(`/tools/live-text/${encodeURIComponent(clean)}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    try {
      const res = await apiFetch<{ endpoint: LiveEndpoint }>(
        "/api/tools/live-text/endpoints",
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim() || "Live Text Room",
            slug: customSlug.trim() || null,
          }),
        },
        null
      );
      setTitle("");
      setCustomSlug("");
      router.push(`/tools/live-text/${encodeURIComponent(res.endpoint.slug)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete room "/tools/live-text/${slug}"?`)) return;
    try {
      await apiFetch(`/api/tools/live-text/endpoints/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      setEndpoints((prev) => prev.filter((ep) => ep.slug !== slug));
    } catch {
      // ignore
    }
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  }

  return (
    <AppShell
      title="Live Text Share"
      subtitle="/live"
      headerRight={
        <form onSubmit={handleJump} className="hidden sm:flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 h-8 focus-within:border-blue-500">
            <span className="text-[11px] font-mono text-[var(--text-muted)] select-none mr-1">/</span>
            <input
              type="text"
              value={jumpSlug}
              onChange={(e) => setJumpSlug(e.target.value)}
              placeholder="jump-to-room"
              className="w-28 bg-transparent text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            Go
          </button>
        </form>
      }
    >
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 lg:px-8 space-y-8">
        <section>
          <LiveTextEditor slug="live" compactMode />
        </section>

        <section className="border-t border-[var(--border-subtle)] pt-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-main)]">Custom Rooms</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Create or jump to dedicated rooms for separate Cloud VMs or servers.
              </p>
            </div>

            <form onSubmit={handleJump} className="flex sm:hidden gap-2">
              <div className="flex-1 flex items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 h-9 focus-within:border-blue-500">
                <span className="text-xs font-mono text-[var(--text-muted)] select-none mr-1">/</span>
                <input
                  type="text"
                  value={jumpSlug}
                  onChange={(e) => setJumpSlug(e.target.value)}
                  placeholder="room-slug"
                  className="w-full bg-transparent text-xs font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-3.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Open
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  New Room
                </h3>

                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Prod VM"
                      maxLength={80}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                      Slug (optional)
                    </label>
                    <div className="flex items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 focus-within:border-blue-500">
                      <span className="text-xs font-mono text-[var(--text-muted)] select-none whitespace-nowrap mr-1">
                        /
                      </span>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        placeholder="auto-generated"
                        maxLength={50}
                        className="w-full bg-transparent py-2 text-xs sm:text-sm font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {creating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Create Room
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
                <div className="border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between bg-[var(--bg-surface-2)]">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Active Rooms ({endpoints.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchEndpoints}
                    className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingList ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                  {endpoints.map((ep) => {
                    const shareUrl =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/tools/live-text/${ep.slug}`
                        : `/tools/live-text/${ep.slug}`;
                    const curlCmd =
                      typeof window !== "undefined"
                        ? `curl -s "${window.location.origin}/api/tools/live-text/endpoints/${ep.slug}/raw"`
                        : `curl -s "/api/tools/live-text/endpoints/${ep.slug}/raw"`;

                    return (
                      <div
                        key={ep.id}
                        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--bg-surface-2)] transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/tools/live-text/${ep.slug}`}
                              className="text-sm font-medium text-[var(--text-main)] hover:text-blue-600 dark:hover:text-blue-300 truncate"
                            >
                              {ep.title}
                            </Link>
                            <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                              /{ep.slug}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              {ep.active_count} online
                            </span>
                            <span>{new Date(ep.updated_at).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyText(`url-${ep.slug}`, shareUrl)}
                            title="Copy room link"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                          >
                            {copiedKey === `url-${ep.slug}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            )}
                            URL
                          </button>
                          <button
                            type="button"
                            onClick={() => copyText(`curl-${ep.slug}`, curlCmd)}
                            title="Copy curl command"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                          >
                            {copiedKey === `curl-${ep.slug}` ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Terminal className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                            )}
                            curl
                          </button>
                          <Link
                            href={`/tools/live-text/${ep.slug}`}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-500"
                          >
                            Open
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                          {ep.slug !== "live" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(ep.slug)}
                              title="Delete room"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
