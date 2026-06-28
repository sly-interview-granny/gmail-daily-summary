import { google } from 'googleapis';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface StoredCredentials {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function createOAuth2Client(credentials?: StoredCredentials) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    throw new Error(
      'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.',
    );
  }

  const client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );

  if (credentials) {
    client.setCredentials({
      access_token: credentials.access_token ?? undefined,
      refresh_token: credentials.refresh_token ?? undefined,
      expiry_date: credentials.expiry_date ?? undefined,
    });
  }

  return client;
}

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  const client = createOAuth2Client({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}
