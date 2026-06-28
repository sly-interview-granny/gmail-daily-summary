import { NextResponse } from 'next/server';
import { getAuthUrl, getGoogleOAuthConfig } from '@/lib/google-auth';

export async function GET() {
  if (!getGoogleOAuthConfig()) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured' },
      { status: 500 },
    );
  }

  return NextResponse.redirect(getAuthUrl());
}
