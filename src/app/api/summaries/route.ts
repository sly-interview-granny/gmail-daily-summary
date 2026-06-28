import { NextResponse } from 'next/server';
import { getSummaries, getSummaryByDate } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const latest = searchParams.get('latest');

    if (date) {
      const summary = getSummaryByDate(date);
      if (!summary) {
        return NextResponse.json(
          { error: `No summary found for ${date}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ summary });
    }

    const summaries = getSummaries();

    if (latest === 'true') {
      const summary = summaries[0] ?? null;
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ summaries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch summaries';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
