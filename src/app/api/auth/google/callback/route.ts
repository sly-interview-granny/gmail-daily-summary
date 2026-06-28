import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { saveTokens } from '@/lib/db';
import {
  createOAuth2Client,
  exchangeCodeForTokens,
  getGoogleOAuthConfig,
} from '@/lib/google-auth';

export async function GET(request: Request) {
  if (!getGoogleOAuthConfig()) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json(
        { error: 'Google did not return the required tokens' },
        { status: 400 },
      );
    }

    const auth = createOAuth2Client({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const gmail = google.gmail({ version: 'v1', auth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const userEmail = profile.data.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Could not determine Gmail account email' },
        { status: 400 },
      );
    }

    saveTokens({
      user_email: userEmail,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to complete OAuth flow';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
