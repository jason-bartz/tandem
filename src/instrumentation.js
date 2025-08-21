export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on the server
    const { initPuzzleScheduler } = await import('./lib/scheduler');
    
    // Initialize the puzzle rotation scheduler
    initPuzzleScheduler();
    
    console.log('[Instrumentation] Server-side initialization complete');
  }
}