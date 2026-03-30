'use client';

import { useSearchParams } from 'next/navigation';
import { DailyAlchemyGame } from '@/components/daily-alchemy';

/**
 * Daily Alchemy Page
 * Main route for the Daily Alchemy game
 * Supports: /daily-alchemy (today) or /daily-alchemy?date=YYYY-MM-DD (archive)
 */
export default function DailyAlchemyPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');

  return <DailyAlchemyGame initialDate={dateParam} />;
}
