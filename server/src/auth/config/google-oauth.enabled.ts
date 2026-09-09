/**
 * Google sign-in is opt-in: with no credentials the strategy is never
 * registered and the /auth/google routes report 503 instead of taking the
 * whole server down at boot.
 */
export const isGoogleOAuthConfigured = () =>
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
