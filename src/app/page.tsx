"use client";

import { useCallback, useEffect, useState } from "react";
import AuthButton from "@/components/AuthButton";
import SummaryCard from "@/components/SummaryCard";
import SummaryList from "@/components/SummaryList";

interface AuthStatus {
  connected: boolean;
  email?: string;
}

interface Summary {
  id: number;
  date: string;
  content: string;
  email_count: number;
  created_at: string;
}

type PageState = "loading" | "ready" | "error";

export default function DashboardPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [pageError, setPageError] = useState<string | null>(null);

  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const loadAuthStatus = useCallback(async () => {
    const response = await fetch("/api/auth/status");
    if (!response.ok) {
      throw new Error("Could not check Gmail connection status.");
    }
    return (await response.json()) as AuthStatus;
  }, []);

  const loadSummaries = useCallback(async () => {
    const response = await fetch("/api/summaries");
    if (!response.ok) {
      throw new Error("Could not load summaries.");
    }

    const data = (await response.json()) as
      | Summary[]
      | { summaries?: Summary[]; latest?: Summary | null };

    if (Array.isArray(data)) {
      return data;
    }

    if (data.summaries) {
      return data.summaries;
    }

    return data.latest ? [data.latest] : [];
  }, []);

  const loadSummaryByDate = useCallback(async (date: string) => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await fetch(
        `/api/summaries?date=${encodeURIComponent(date)}`,
      );
      if (!response.ok) {
        throw new Error("Could not load summary for that date.");
      }

      const data = (await response.json()) as Summary | { summary?: Summary };
      const summary = "summary" in data && data.summary ? data.summary : data;

      if (summary && typeof summary === "object" && "content" in summary) {
        setSelectedSummary(summary as Summary);
        setSelectedDate(date);
      } else {
        throw new Error("Summary not found.");
      }
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "Failed to load summary.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setPageState("loading");
    setPageError(null);
    setGenerateError(null);

    try {
      const status = await loadAuthStatus();
      setAuthStatus(status);

      if (!status.connected) {
        setSummaries([]);
        setSelectedSummary(null);
        setSelectedDate(null);
        setPageState("ready");
        return;
      }

      const allSummaries = await loadSummaries();
      const sorted = [...allSummaries].sort((a, b) =>
        b.date.localeCompare(a.date),
      );

      setSummaries(sorted);

      if (sorted.length > 0) {
        setSelectedSummary(sorted[0]);
        setSelectedDate(sorted[0].date);
      } else {
        setSelectedSummary(null);
        setSelectedDate(null);
      }

      setPageState("ready");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      setPageState("error");
    }
  }, [loadAuthStatus, loadSummaries]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const handleSelectDate = (date: string) => {
    const cached = summaries.find((summary) => summary.date === date);
    if (cached?.content) {
      setSelectedSummary(cached);
      setSelectedDate(date);
      setSummaryError(null);
      return;
    }

    void loadSummaryByDate(date);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch("/api/summaries/generate", {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to generate summary.",
        );
      }

      await refreshDashboard();
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Failed to generate summary.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const summaryTitle =
    selectedDate && summaries.length > 0
      ? selectedDate === summaries[0]?.date
        ? "Latest Summary"
        : `Summary · ${selectedDate}`
      : "Latest Summary";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
            Daily Digest
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Gmail Daily Summary
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            A concise AI digest of your inbox — key threads, action items, and
            noise filtered out.
          </p>
        </div>

        <div className="shrink-0">
          {pageState !== "loading" && (
            <AuthButton
              connected={authStatus.connected}
              email={authStatus.email}
              onStatusChange={() => void refreshDashboard()}
            />
          )}
        </div>
      </header>

      {pageState === "loading" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <SummaryCard loading title="Latest Summary" summary={null} />
          <SummaryList
            summaries={[]}
            selectedDate={null}
            onSelect={() => undefined}
            loading
          />
        </div>
      )}

      {pageState === "error" && (
        <section className="card border-danger/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Unable to load dashboard
          </h2>
          <p className="mt-2 text-sm text-red-300">{pageError}</p>
          <button
            type="button"
            onClick={() => void refreshDashboard()}
            className="btn btn-secondary mt-4"
          >
            Try again
          </button>
        </section>
      )}

      {pageState === "ready" && !authStatus.connected && (
        <section className="card p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <svg
              aria-hidden
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6.5V17.5C4 18.3284 4.67157 19 5.5 19H18.5C19.3284 19 20 18.3284 20 17.5V6.5C20 5.67157 19.3284 5 18.5 5H5.5C4.67157 5 4 5.67157 4 6.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M4 7L12 12.5L20 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Connect your Gmail account
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Grant read-only access to generate a daily summary of today&apos;s
            emails. Your credentials stay on this server.
          </p>
          <div className="mt-6 flex justify-center">
            <AuthButton
              connected={false}
              onStatusChange={() => void refreshDashboard()}
            />
          </div>
        </section>
      )}

      {pageState === "ready" && authStatus.connected && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="btn btn-primary"
            >
              {generating ? (
                <>
                  <Spinner />
                  Generating…
                </>
              ) : (
                "Generate Summary Now"
              )}
            </button>
            {generateError && (
              <p className="text-sm text-red-300">{generateError}</p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <SummaryCard
              summary={selectedSummary}
              loading={summaryLoading}
              error={summaryError}
              title={summaryTitle}
            />
            <SummaryList
              summaries={summaries}
              selectedDate={selectedDate}
              onSelect={handleSelectDate}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
