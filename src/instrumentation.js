export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initPuzzleScheduler } = await import('./lib/scheduler');

    initPuzzleScheduler();
  }
}
