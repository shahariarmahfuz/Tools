export interface ToolItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: "live" | "coming-soon";
  category: string;
  badge?: string;
}

export const TOOLS_CATALOG: ToolItem[] = [
  {
    id: "live-text",
    name: "Live Text Transfer",
    tagline: "Real-time cloud clipboard & typing sync",
    description:
      "Open a live box immediately (no login required) or create custom rooms to stream text in real time to your Cloud VM or any device. Supports live keystroke sync, auto-save, snapshots, and raw curl access.",
    href: "/tools/live-text",
    status: "live",
    category: "Transfer & Sync",
    badge: "Live WebSocket",
  },
  {
    id: "qr-generator",
    name: "QR Code Studio",
    tagline: "Instant high-res QR codes for URLs, WiFi & text",
    description:
      "Generate crisp PNG and SVG QR codes for URLs, Live Text rooms, WiFi networks, or plain text with custom colors and error correction.",
    href: "/tools/qr-generator",
    status: "live",
    category: "Quick Utilities",
    badge: "PNG & SVG",
  },
  {
    id: "link-fixer",
    name: "Link Fixer",
    tagline: "Fix broken URLs copied from terminals & logs",
    description:
      "Strip line wraps, extra spaces, ANSI codes, and box borders from terminal-copied links or extract clean URLs from logs.",
    href: "/tools/link-fixer",
    status: "live",
    category: "Quick Utilities",
    badge: "Instant",
  },
  {
    id: "json-formatter",
    name: "JSON Formatter & Diff",
    tagline: "Format, validate, and minify JSON payloads",
    description: "Planned next: fast client-side JSON prettifier, validator, and tree viewer.",
    href: "#",
    status: "coming-soon",
    category: "Developer Tools",
  },
  {
    id: "base64-codec",
    name: "Base64 / Hash / UUID",
    tagline: "Encode, decode, and generate secure tokens",
    description: "Planned next: everyday developer encoding, hashing, and password utilities.",
    href: "#",
    status: "coming-soon",
    category: "Developer Tools",
  },
];
