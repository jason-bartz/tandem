// Helper to get the correct API base URL
// For now, always use relative paths to avoid CORS issues
export function getApiUrl(endpoint) {
  // Always use relative path - the custom domain should proxy to Vercel
  return endpoint;
}