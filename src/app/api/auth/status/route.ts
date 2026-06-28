import { NextResponse } from 'next/server';
import { getTokens } from '@/lib/db';
import { getGoogleOAuthConfig } from '@/lib/google-auth';

export async function GET() {
  if (!getGoogleOAuthConfig()) {
    return NextResponse.json({ connected: false });
  }

  const tokens = getTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: tokens.user_email,
  });
}
