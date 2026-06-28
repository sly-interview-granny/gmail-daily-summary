import { NextResponse } from 'next/server';
import { getEmailDetails, listTodayEmails } from '@/lib/gmail';
import { getTokens, saveTokens } from '@/lib/db';
import { refreshAccessToken } from '@/lib/google-auth';

async function getValidAccessToken(): Promise<string | null> {
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

  return accessToken;
}

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Gmail is not connected' }, { status: 401 });
    }

    const messageIds = await listTodayEmails(accessToken);
    const emails = await Promise.all(
      messageIds.map((id) => getEmailDetails(accessToken, id)),
    );

    return NextResponse.json({ count: emails.length, emails });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch emails';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
