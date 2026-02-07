import { redirect } from 'next/navigation';
import GameContainerClient from '@/components/game/GameContainerClient';

// Conditional dynamic based on build target
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';
const isStandaloneAlchemy = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';

export const dynamic = isCapacitorBuild ? undefined : 'force-dynamic';
export const revalidate = isCapacitorBuild ? undefined : 0;

export default async function Home() {
  // Standalone Daily Alchemy should never show the Tandem home page
  if (isStandaloneAlchemy) {
    redirect('/daily-alchemy');
  }

  // Following Wordle's approach: ALL date calculations happen client-side
  // This ensures users see puzzles change at their local midnight, not server's timezone
  // Server-side date calculations on Vercel (UTC) would cause timezone mismatches
  // The client will fetch the puzzle using its own local date calculation
  return <GameContainerClient initialPuzzleData={null} />;
}
