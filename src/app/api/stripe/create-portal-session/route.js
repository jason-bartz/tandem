import { NextResponse } from 'next/server';

// Stripe portal is no longer available — all content is free
export async function POST() {
  return NextResponse.json(
    { error: 'Subscriptions are no longer available. All content is free.' },
    { status: 410 }
  );
}
