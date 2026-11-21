import { NO_STORE_CACHE_CONTROL } from "../cache/profiles";

/**
 * On the Worker, a `notFound` from getServerSideProps can come back as a bare "This page could not be found"
 * with no Content-Type, which browsers show as a connection error. Swap that body for the styled /404 page.
 */
export async function withStyledNotFound(
  request: Request,
  response: Response,
  fetchPage: (request: Request) => Promise<Response>
): Promise<Response> {
  if (response.status !== 404 || response.headers.has("content-type")) return response;

  const page = await fetchPage(new Request(new URL("/404", request.url)));
  if (!page.ok) return response;

  return new Response(page.body, {
    status: 404,
    headers: {
      "Content-Type": page.headers.get("content-type") ?? "text/html; charset=utf-8",
      "Cache-Control": NO_STORE_CACHE_CONTROL,
    },
  });
}
