// Helper to get the correct API base URL
// Handles custom domain redirect issues
export function getApiUrl(endpoint) {
  // If we're on the custom domain, use the Vercel deployment URL for API calls
  if (typeof window !== 'undefined' && window.location.hostname === 'www.tandemdaily.com') {
    return `https://tandem-jasons-projects-3cdf6ae5.vercel.app${endpoint}`;
  }
  
  // Otherwise use relative path
  return endpoint;
}