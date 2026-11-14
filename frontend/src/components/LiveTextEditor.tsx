"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookmarkPlus,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  History,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Terminal,
  Trash2,
  Users,
  WrapText,
} from "lucide-react";
import { ApiError, apiFetch, getWebSocketUrl } from "@/lib/api";
import type { EndpointSnapshot, LiveEndpoint, PresenceState } from "@/lib/types";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";
type SaveState = "idle" | "saving" | "saved" | "error";

interface LiveTextEditorProps {
  slug: string;
  compactMode?: boolean;
}

export function LiveTextEditor({ slug, compactMode = false }: LiveTextEditorProps) {
  const [clientId, setClientId] = useState<string>("");
  useEffect(() => {
    let id = sessionStorage.getItem("toolbox_client_id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 12)
          : Math.random().toString(36).slice(2, 14);
      sessionStorage.setItem("toolbox_client_id", id);
    }
    const resolvedId = id;
    queueMicrotask(() => setClientId(resolvedId));
  }, []);

  const [endpoint, setEndpoint] = useState<LiveEndpoint | null>(null);
  const [content, setContent] = useState("");
  const [snapshots, setSnapshots] = useState<EndpointSnapshot[]>([]);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingMissing, setCreatingMissing] = useState(false);

  const [wsState, setWsState] = useState<ConnectionState>("connecting");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [lastRemoteEditor, setLastRemoteEditor] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresenceState>({ active_count: 1, viewers: [] });

  const [monoFont, setMonoFont] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const pendingContentRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 1800);
  }, []);

  const loadEndpoint = useCallback(async () => {
    if (!slug) return;
    setRefreshing(true);
    try {
      const res = await apiFetch<{
        endpoint: LiveEndpoint;
        snapshots: EndpointSnapshot[];
      }>(`/api/tools/live-text/endpoints/${encodeURIComponent(slug)}`, {}, null);
      setLoadError(null);
      setEndpoint(res.endpoint);
      setContent(res.endpoint.content);
      setUpdatedAt(res.endpoint.updated_at);
      setSnapshots(res.snapshots);
      setSaveState("saved");
    } catch (err) {
      if (err instanceof ApiError) {
        setLoadError({ status: err.status, message: err.message });
      } else {
        setLoadError({ status: 500, message: "Failed to load room" });
      }
      setEndpoint(null);
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function initialFetch() {
      try {
        const res = await apiFetch<{
          endpoint: LiveEndpoint;
          snapshots: EndpointSnapshot[];
        }>(`/api/tools/live-text/endpoints/${encodeURIComponent(slug)}`, {}, null);
        if (cancelled) return;
        setLoadError(null);
        setEndpoint(res.endpoint);
        setContent(res.endpoint.content);
        setUpdatedAt(res.endpoint.updated_at);
        setSnapshots(res.snapshots);
        setSaveState("saved");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setLoadError({ status: err.status, message: err.message });
        } else {
          setLoadError({ status: 500, message: "Failed to load room" });
        }
        setEndpoint(null);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }
    void initialFetch();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const endpointId = endpoint?.id ?? null;

  useEffect(() => {
    if (!slug || !clientId || !endpointId || loadError) return;

    let unmounted = false;

    function connect() {
      if (unmounted) return;
      setWsState((prev) => (prev === "connected" ? "connected" : "connecting"));
      const wsUrl = getWebSocketUrl(slug, clientId, null);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        setWsState("connected");
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "sync") {
            setContent(msg.content ?? "");
            setUpdatedAt(msg.updated_at ?? null);
            if (msg.presence) setPresence(msg.presence);
            setSaveState("saved");
          } else if (msg.type === "text_update") {
            if (msg.sender_client_id !== clientId) {
              setContent(msg.content ?? "");
              setUpdatedAt(msg.updated_at ?? null);
              setLastRemoteEditor(msg.sender_name || "Remote");
              if (msg.presence) setPresence(msg.presence);
              setSaveState("saved");
            }
          } else if (msg.type === "saved") {
            setUpdatedAt(msg.updated_at ?? null);
            setSaveState("saved");
          } else if (msg.type === "presence") {
            if (msg.presence) setPresence(msg.presence);
          } else if (msg.type === "endpoint_deleted") {
            setLoadError({ status: 404, message: "This room was deleted." });
            setEndpoint(null);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (evt) => {
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        if (unmounted) return;
        if (evt.code === 4004) {
          setWsState("offline");
          return;
        }
        setWsState("reconnecting");
        reconnectTimerRef.current = setTimeout(connect, 1800);
      };

      ws.onerror = () => {
        // handled by onclose
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (sendThrottleTimerRef.current) clearTimeout(sendThrottleTimerRef.current);
      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [slug, clientId, endpointId, loadError]);

  const sendLiveUpdate = useCallback(
    async (nextText: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "text_update",
            content: nextText,
            is_typing: true,
          })
        );
        lastSentAtRef.current = Date.now();
        return;
      }

      try {
        const res = await apiFetch<{ endpoint: LiveEndpoint }>(
          `/api/tools/live-text/endpoints/${encodeURIComponent(slug)}/content`,
          {
            method: "PUT",
            body: JSON.stringify({ content: nextText }),
          },
          null
        );
        setUpdatedAt(res.endpoint.updated_at);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [slug]
  );

  const handleTextChange = useCallback(
    (nextValue: string) => {
      setContent(nextValue);
      setSaveState("saving");
      pendingContentRef.current = nextValue;

      const now = Date.now();
      const elapsed = now - lastSentAtRef.current;

      if (elapsed >= 45) {
        if (sendThrottleTimerRef.current) {
          clearTimeout(sendThrottleTimerRef.current);
          sendThrottleTimerRef.current = null;
        }
        pendingContentRef.current = null;
        void sendLiveUpdate(nextValue);
      } else if (!sendThrottleTimerRef.current) {
        sendThrottleTimerRef.current = setTimeout(() => {
          sendThrottleTimerRef.current = null;
          if (pendingContentRef.current !== null) {
            const payload = pendingContentRef.current;
            pendingContentRef.current = null;
            void sendLiveUpdate(payload);
          }
        }, 45 - elapsed);
      }

      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "typing", is_typing: false }));
        }
      }, 1200);
    },
    [sendLiveUpdate]
  );

  async function handleSaveSnapshot(customText?: string) {
    const textToSave = customText !== undefined ? customText : content;
    if (!textToSave.trim()) {
      showToast("Nothing to snapshot");
      return;
    }
    setSavingSnapshot(true);
    try {
      const res = await apiFetch<{ snapshot: EndpointSnapshot }>(
        `/api/tools/live-text/endpoints/${encodeURIComponent(slug)}/snapshots`,
        {
          method: "POST",
          body: JSON.stringify({ content: textToSave }),
        },
        null
      );
      setSnapshots((prev) => [res.snapshot, ...prev].slice(0, 20));
      showToast("Snapshot saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save snapshot");
    } finally {
      setSavingSnapshot(false);
    }
  }

  async function handleClearBox() {
    if (!content) return;
    if (content.trim()) {
      try {
        const res = await apiFetch<{ snapshot: EndpointSnapshot }>(
          `/api/tools/live-text/endpoints/${encodeURIComponent(slug)}/snapshots`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
          null
        );
        setSnapshots((prev) => [res.snapshot, ...prev].slice(0, 20));
      } catch {
        // non-blocking
      }
    }
    handleTextChange("");
    showToast("Cleared (snapshot saved)");
  }

  async function handleCopy(key: string, textToCopy: string, label: string) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAction(key);
      showToast(label);
      setTimeout(() => setCopiedAction(null), 1600);
    } catch {
      showToast("Copy failed");
    }
  }

  async function handlePaste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) {
        showToast("Clipboard is empty");
        return;
      }
      const next = content ? `${content}\n${clip}` : clip;
      handleTextChange(next);
      showToast("Pasted");
    } catch {
      showToast("Paste directly inside the editor");
    }
  }

  function handleDownloadTxt() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateMissing() {
    setCreatingMissing(true);
    try {
      await apiFetch(
        "/api/tools/live-text/endpoints",
        {
          method: "POST",
          body: JSON.stringify({
            title: `Room ${slug}`,
            slug,
          }),
        },
        null
      );
      await loadEndpoint();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setCreatingMissing(false);
    }
  }

  const stats = useMemo(() => {
    const chars = content.length;
    const lines = content ? content.split("\n").length : 0;
    return { chars, lines };
  }, [content]);

  const otherTypingViewers = useMemo(
    () =>
      presence.viewers.filter(
        (v) => v.client_id !== clientId && v.is_typing
      ),
    [presence.viewers, clientId]
  );

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tools/live-text/${slug}`
      : `/tools/live-text/${slug}`;

  const curlCmd =
    typeof window !== "undefined"
      ? `curl -s "${window.location.origin}/api/tools/live-text/endpoints/${slug}/raw"`
      : `curl -s "/api/tools/live-text/endpoints/${slug}/raw"`;

  if (pageLoading) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 flex items-center justify-center shadow-sm">
        <div className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Loading room /{slug}...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto my-8 w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center shadow-lg">
        <Radio className="h-7 w-7 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-[var(--text-main)]">
          Room &ldquo;{slug}&rdquo; not found
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Create this room instantly to start syncing text.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleCreateMissing}
            disabled={creatingMissing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {creatingMissing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create /{slug}
          </button>
          <Link
            href="/tools/live-text"
            className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Default Room
          </Link>
        </div>
      </div>
    );
  }

  if (!endpoint) return null;

  return (
    <div className="w-full">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-blue-500/30 bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-main)] shadow-xl">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`${showHistory ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col`}>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-md overflow-hidden flex flex-col">
            {/* Editor Top Bar */}
            <div className="border-b border-[var(--border-subtle)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface-2)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm sm:text-base font-semibold text-[var(--text-main)] truncate">
                    {endpoint.title}
                  </h1>
                  <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono text-blue-700 dark:text-blue-300">
                    /{endpoint.slug}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        wsState === "connected"
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : wsState === "offline"
                          ? "bg-rose-500"
                          : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        wsState === "connected"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : wsState === "offline"
                          ? "text-rose-500 dark:text-rose-400"
                          : "text-amber-600 dark:text-amber-300"
                      }`}
                    >
                      {wsState === "connected"
                        ? "Live"
                        : wsState === "offline"
                        ? "Offline"
                        : "Syncing"}
                    </span>
                  </span>

                  <span className="text-[var(--border-main)]">|</span>

                  <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                    <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    {presence.active_count} online
                  </span>

                  {otherTypingViewers.length > 0 && (
                    <>
                      <span className="text-[var(--border-main)]">|</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                        typing...
                      </span>
                    </>
                  )}

                  <span className="text-[var(--border-main)]">|</span>

                  <span>
                    {saveState === "saving"
                      ? "Saving..."
                      : saveState === "error"
                      ? "Save failed"
                      : updatedAt
                      ? `Saved ${new Date(updatedAt).toLocaleTimeString()}`
                      : "Ready"}
                    {lastRemoteEditor && saveState === "saved"
                      ? ` (${lastRemoteEditor})`
                      : ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistory((s) => !s)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  showHistory
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200"
                    : "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History ({snapshots.length})
              </button>
            </div>

            {/* Unified Textarea */}
            <textarea
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="এখানে লিখুন বা পেস্ট করুন... (Type or paste text — syncs live to your Cloud VM and saves automatically)"
              spellCheck={false}
              wrap={wordWrap ? "soft" : "off"}
              className={`w-full ${
                compactMode ? "min-h-[290px] sm:min-h-[370px]" : "min-h-[400px] sm:min-h-[500px]"
              } resize-y bg-[var(--bg-input)] p-4 sm:p-5 text-[14px] sm:text-[15px] leading-relaxed text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none ${
                monoFont ? "font-mono" : "font-sans"
              } ${!wordWrap ? "overflow-x-auto whitespace-pre" : ""}`}
            />

            {/* Bottom Action Bar */}
            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3.5 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy("text", content, "Copied to clipboard")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer shadow-xs"
                >
                  {copiedAction === "text" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy
                </button>

                <button
                  type="button"
                  onClick={loadEndpoint}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  Paste
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveSnapshot()}
                  disabled={savingSnapshot}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <BookmarkPlus className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  Snapshot
                </button>

                <button
                  type="button"
                  onClick={handleClearBox}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy("share", shareUrl, "Room link copied")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  {copiedAction === "share" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  Share
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy("curl", curlCmd, "curl command copied")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  {copiedAction === "curl" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Terminal className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                  curl
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  .txt
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <span>{stats.chars} chars</span>
                <span>•</span>
                <span>{stats.lines} lines</span>
                <button
                  type="button"
                  onClick={() => setMonoFont((m) => !m)}
                  className="rounded border border-[var(--border-main)] bg-[var(--bg-surface)] px-2 py-0.5 font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  {monoFont ? "Mono" : "Sans"}
                </button>
                <button
                  type="button"
                  onClick={() => setWordWrap((w) => !w)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-medium cursor-pointer ${
                    wordWrap
                      ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      : "border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
                  }`}
                >
                  <WrapText className="h-3 w-3" />
                  Wrap
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot History Drawer */}
        {showHistory && (
          <aside className="lg:col-span-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col max-h-[560px] shadow-md">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between bg-[var(--bg-surface-2)]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                Snapshots
              </h2>
              <button
                type="button"
                onClick={loadEndpoint}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {snapshots.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                  No snapshots saved yet.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                      <span>{new Date(snap.created_at).toLocaleString()}</span>
                    </div>
                    <pre className="max-h-24 overflow-hidden text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-all mb-2.5">
                      {snap.content.slice(0, 220)}
                      {snap.content.length > 220 ? "..." : ""}
                    </pre>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(`snap-${snap.id}`, snap.content, "Snapshot copied")
                        }
                        className="inline-flex items-center gap-1 rounded border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleTextChange(snap.content);
                          showToast("Restored");
                        }}
                        className="inline-flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
