"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  Link2,
  Mail,
  QrCode,
  Radio,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type ModeTab = "text" | "wifi" | "contact";
type ErrorLevel = "L" | "M" | "Q" | "H";
type WifiEncryption = "WPA" | "WEP" | "nopass";

const COLOR_PRESETS = [
  { name: "Classic", fg: "#09090b", bg: "#ffffff" },
  { name: "Navy", fg: "#0f172a", bg: "#f8fafc" },
  { name: "Blue", fg: "#1d4ed8", bg: "#eff6ff" },
  { name: "Emerald", fg: "#065f46", bg: "#ecfdf5" },
];

export default function QrGeneratorPage() {
  const [tab, setTab] = useState<ModeTab>("text");

  const [textInput, setTextInput] = useState("https://example.com");

  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState<WifiEncryption>("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);

  const [contactType, setContactType] = useState<"mailto" | "tel">("mailto");
  const [contactValue, setContactValue] = useState("");

  const [size, setSize] = useState<number>(512);
  const [margin, setMargin] = useState<number>(2);
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>("M");
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");

  const [svgMarkup, setSvgMarkup] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const payload = useMemo(() => {
    if (tab === "text") {
      return textInput;
    }
    if (tab === "wifi") {
      const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
      if (!ssid.trim()) return "";
      const passPart = wifiEnc === "nopass" ? "" : `P:${esc(wifiPass)};`;
      const hiddenPart = wifiHidden ? "H:true;" : "";
      return `WIFI:T:${wifiEnc};S:${esc(ssid)};${passPart}${hiddenPart};`;
    }
    if (!contactValue.trim()) return "";
    return `${contactType}:${contactValue.trim()}`;
  }, [tab, textInput, ssid, wifiPass, wifiEnc, wifiHidden, contactType, contactValue]);

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      const value = payload.trim();
      if (!value) {
        if (!cancelled) {
          setSvgMarkup("");
          setQrError(null);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        return;
      }

      try {
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, value, {
            width: 260,
            margin,
            errorCorrectionLevel: errorLevel,
            color: { dark: fgColor, light: bgColor },
          });
        }

        const svg = await QRCode.toString(value, {
          type: "svg",
          width: size,
          margin,
          errorCorrectionLevel: errorLevel,
          color: { dark: fgColor, light: bgColor },
        });

        if (!cancelled) {
          setSvgMarkup(svg);
          setQrError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setQrError(err instanceof Error ? err.message : "Failed to generate QR code");
        }
      }
    }

    void renderQr();
    return () => {
      cancelled = true;
    };
  }, [payload, size, margin, errorLevel, fgColor, bgColor]);

  async function handleDownloadPng() {
    if (!payload.trim()) return;
    const dataUrl = await QRCode.toDataURL(payload.trim(), {
      width: size,
      margin,
      errorCorrectionLevel: errorLevel,
      color: { dark: fgColor, light: bgColor },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-code-${size}px.png`;
    a.click();
  }

  function handleDownloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-code.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopySvg() {
    if (!svgMarkup) return;
    await navigator.clipboard.writeText(svgMarkup);
    setCopiedKey("svg");
    setTimeout(() => setCopiedKey(null), 1600);
  }

  async function handleCopyPayload() {
    if (!payload.trim()) return;
    await navigator.clipboard.writeText(payload.trim());
    setCopiedKey("payload");
    setTimeout(() => setCopiedKey(null), 1600);
  }

  function fillLiveTextUrl() {
    if (typeof window !== "undefined") {
      setTab("text");
      setTextInput(`${window.location.origin}/tools/live-text`);
    }
  }

  return (
    <AppShell
      title="QR Studio"
      subtitle="PNG & SVG"
      headerRight={
        <button
          type="button"
          onClick={fillLiveTextUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer whitespace-nowrap"
        >
          <Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Use Live Text URL
        </button>
      }
    >
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-md">
              <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] px-3 py-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTab("text")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    tab === "text"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-200 border border-blue-500/30"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  URL / Text
                </button>
                <button
                  type="button"
                  onClick={() => setTab("wifi")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    tab === "wifi"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-200 border border-blue-500/30"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Wifi className="h-3.5 w-3.5" />
                  WiFi
                </button>
                <button
                  type="button"
                  onClick={() => setTab("contact")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    tab === "contact"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-200 border border-blue-500/30"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email / Phone
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {tab === "text" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">
                        URL or Text Content
                      </label>
                      <button
                        type="button"
                        onClick={fillLiveTextUrl}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Insert Live Text link
                      </button>
                    </div>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={4}
                      placeholder="https://... or any text"
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] p-3 text-sm font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none resize-y"
                    />
                  </div>
                )}

                {tab === "wifi" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        Network Name (SSID)
                      </label>
                      <input
                        type="text"
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        placeholder="MyWiFiNetwork"
                        className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Security
                        </label>
                        <select
                          value={wifiEnc}
                          onChange={(e) => setWifiEnc(e.target.value as WifiEncryption)}
                          className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                        >
                          <option value="WPA">WPA / WPA2 / WPA3</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Open (No Password)</option>
                        </select>
                      </div>
                      {wifiEnc !== "nopass" && (
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                            Password
                          </label>
                          <input
                            type="text"
                            value={wifiPass}
                            onChange={(e) => setWifiPass(e.target.value)}
                            placeholder="WiFi password"
                            className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wifiHidden}
                        onChange={(e) => setWifiHidden(e.target.checked)}
                        className="rounded border-[var(--border-main)] accent-blue-600"
                      />
                      Hidden SSID
                    </label>
                  </div>
                )}

                {tab === "contact" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setContactType("mailto")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          contactType === "mailto"
                            ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200"
                            : "border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
                        }`}
                      >
                        Email (mailto:)
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactType("tel")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                          contactType === "tel"
                            ? "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-200"
                            : "border-[var(--border-main)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
                        }`}
                      >
                        Phone (tel:)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      placeholder={contactType === "mailto" ? "you@domain.com" : "+8801XXXXXXXXX"}
                      className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Style & Export Options
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setFgColor(preset.fg);
                      setBgColor(preset.bg);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:border-blue-500/50 cursor-pointer"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-sm border border-[var(--border-main)]"
                      style={{ backgroundColor: preset.fg }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Foreground
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2 py-1.5">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-5 w-6 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {fgColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Background
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2 py-1.5">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-5 w-6 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {bgColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Export Size
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                  >
                    <option value={256}>256 × 256 px</option>
                    <option value={512}>512 × 512 px</option>
                    <option value={1024}>1024 × 1024 px</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                    Error Correction
                  </label>
                  <select
                    value={errorLevel}
                    onChange={(e) => setErrorLevel(e.target.value as ErrorLevel)}
                    className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text-main)] focus:border-blue-500 focus:outline-none"
                  >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                  <span>Quiet Zone Margin</span>
                  <span className="font-mono">{margin} modules</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 flex flex-col items-center shadow-md">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Live Preview
                </span>
                <span className="text-[11px] font-mono text-violet-600 dark:text-violet-300">
                  {size}px • ECC-{errorLevel}
                </span>
              </div>

              <div className="w-full flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-6 min-h-[290px]">
                {!payload.trim() ? (
                  <div className="text-center text-xs text-[var(--text-muted)]">
                    <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Enter content on the left to generate a QR code
                  </div>
                ) : qrError ? (
                  <div className="text-center text-xs text-rose-500 dark:text-rose-400">
                    {qrError}
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="rounded-lg shadow-lg max-w-full h-auto"
                  />
                )}
              </div>

              <div className="mt-4 w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!payload.trim() || Boolean(qrError)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  disabled={!svgMarkup || Boolean(qrError)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] py-2 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download SVG
                </button>
              </div>

              <div className="mt-2 w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopySvg}
                  disabled={!svgMarkup}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {copiedKey === "svg" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  )}
                  Copy SVG
                </button>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  disabled={!payload.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {copiedKey === "payload" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  Copy Data
                </button>
              </div>

              {payload.trim() && (
                <div className="mt-4 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Encoded Payload
                  </div>
                  <div className="text-xs font-mono text-[var(--text-secondary)] break-all max-h-16 overflow-y-auto">
                    {payload}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
