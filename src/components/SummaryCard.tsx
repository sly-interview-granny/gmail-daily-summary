"use client";

interface Summary {
  id: number;
  date: string;
  content: string;
  email_count: number;
  created_at: string;
}

interface SummaryCardProps {
  summary: Summary | null;
  loading?: boolean;
  error?: string | null;
  title?: string;
}

export default function SummaryCard({
  summary,
  loading = false,
  error = null,
  title = "Latest Summary",
}: SummaryCardProps) {
  if (loading) {
    return (
      <section className="card p-6">
        <div className="mb-4 h-6 w-40 animate-pulse-soft rounded bg-white/10" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse-soft rounded bg-white/10" />
          <div className="h-4 w-11/12 animate-pulse-soft rounded bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse-soft rounded bg-white/10" />
          <div className="h-4 w-full animate-pulse-soft rounded bg-white/10" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card border-danger/30 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-sm text-red-300">{error}</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          No summary yet. Connect Gmail and generate your first daily digest.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-card-border pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {formatSummaryDate(summary.date)}
          </p>
        </div>
        <div className="rounded-full border border-card-border bg-white/[0.03] px-3 py-1 text-xs text-muted">
          {summary.email_count}{" "}
          {summary.email_count === 1 ? "email" : "emails"} summarized
        </div>
      </header>

      <div
        className="summary-prose"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(summary.content) }}
      />
    </section>
  );
}

function formatSummaryDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html.push(
        `<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      closeList();
      html.push(`<p>${inlineMarkdown(orderedMatch[1])}</p>`);
      continue;
    }

    if (line.startsWith(">")) {
      closeList();
      html.push(
        `<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`,
      );
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}
