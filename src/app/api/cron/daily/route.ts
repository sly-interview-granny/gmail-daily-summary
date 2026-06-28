import { NextResponse } from 'next/server';
import {
  getEmailDetails,
  listTodayEmails,
  type ParsedEmail,
} from '@/lib/gmail';
import { getTokens, saveSummary, saveTokens } from '@/lib/db';
import { refreshAccessToken } from '@/lib/google-auth';
import { summarizeEmails } from '@/lib/summarize';

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get('x-cron-secret') === secret;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getValidAccessToken(): Promise<{
  accessToken: string;
  userEmail: string;
} | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) {
    return null;
  }

  let accessToken: string | undefined = tokens.access_token;
  const isExpired =
    !accessToken || (tokens.expiry != null && tokens.expiry <= Date.now());

  if (isExpired) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    accessToken = refreshed.access_token ?? undefined;

    if (!accessToken) {
      throw new Error('Failed to refresh Gmail access token');
    }

    saveTokens({
      user_email: tokens.user_email,
      access_token: accessToken,
      refresh_token: tokens.refresh_token,
      expiry: refreshed.expiry_date ?? tokens.expiry,
    });
  }

  return { accessToken, userEmail: tokens.user_email };
}

async function fetchTodayEmails(accessToken: string): Promise<ParsedEmail[]> {
  const messageIds = await listTodayEmails(accessToken);
  return Promise.all(
    messageIds.map((messageId) => getEmailDetails(accessToken, messageId)),
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = await getValidAccessToken();
    if (!auth) {
      return NextResponse.json(
        { error: 'Gmail is not connected' },
        { status: 400 },
      );
    }

    const emails = await fetchTodayEmails(auth.accessToken);
    const content = await summarizeEmails(emails);
    const date = getTodayDateString();

    saveSummary(date, content, emails.length);

    return NextResponse.json({
      success: true,
      date,
      emailCount: emails.length,
      userEmail: auth.userEmail,
      content,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate daily summary';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
