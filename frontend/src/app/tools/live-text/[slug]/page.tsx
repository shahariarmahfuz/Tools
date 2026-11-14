"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LiveTextEditor } from "@/components/LiveTextEditor";

export default function LiveTextEndpointPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug || "").toLowerCase();

  return (
    <AppShell
      title="Live Text Share"
      subtitle={`/${slug}`}
      headerRight={
        <Link
          href="/tools/live-text"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Rooms
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 lg:px-8">
        <LiveTextEditor slug={slug} />
      </div>
    </AppShell>
  );
}
