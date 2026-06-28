"use client";

interface SummaryListItem {
  id: number;
  date: string;
  email_count: number;
  created_at: string;
}

interface SummaryListProps {
  summaries: SummaryListItem[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
}

export default function SummaryList({
  summaries,
  selectedDate,
  onSelect,
  loading = false,
}: SummaryListProps) {
  if (loading) {
    return (
      <section className="card p-4">
        <h3 className="mb-3 px-2 text-sm font-medium text-muted">
          Past Summaries
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse-soft rounded-lg bg-white/10"
            />
          ))}
        </div>
      </section>
    );
  }

  if (summaries.length === 0) {
    return (
      <section className="card p-4">
        <h3 className="mb-2 px-2 text-sm font-medium text-muted">
          Past Summaries
        </h3>
        <p className="px-2 py-3 text-sm text-muted">
          Generated summaries will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4">
      <h3 className="mb-3 px-2 text-sm font-medium text-muted">
        Past Summaries
      </h3>
      <ul className="space-y-1">
        {summaries.map((summary) => {
          const isSelected = summary.date === selectedDate;

          return (
            <li key={summary.id}>
              <button
                type="button"
                onClick={() => onSelect(summary.date)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-accent/15 text-foreground ring-1 ring-accent/30"
                    : "text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                <span className="font-medium">{formatListDate(summary.date)}</span>
                <span className="text-xs text-muted">
                  {summary.email_count} emails
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatListDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (parsed.getTime() === today.getTime()) {
    return "Today";
  }
  if (parsed.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
