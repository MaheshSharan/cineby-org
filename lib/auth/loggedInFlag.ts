/**
 * Readable marker the server sets at sign-in so the browser can tell, without a request, whether
 * a session probably exists. It is a hint only: the server remains the authority on who is signed in.
 */
export const LOGGED_IN_COOKIE_NAME = "cineby_logged_in";

export function isLoggedInFlagSet(): boolean {
  return typeof document !== "undefined" && document.cookie.includes(`${LOGGED_IN_COOKIE_NAME}=1`);
}

export function clearLoggedInFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOGGED_IN_COOKIE_NAME}=; Path=/; Max-Age=0`;
}
