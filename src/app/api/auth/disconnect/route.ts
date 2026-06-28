import { NextResponse } from 'next/server';
import { deleteTokens } from '@/lib/db';

export async function POST() {
  try {
    deleteTokens();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to disconnect Gmail';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
