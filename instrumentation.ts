import type { Instrumentation } from "next";
import { reportError } from "@/lib/observability/report-error";

/** Sunucu tarafında yakalanan TÜM hatalar buradan geçer: Server
 * Component render'ı, Route Handler'lar, Server Action'lar ve proxy.
 * (Next.js 15+ `onRequestError` kancası.) */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest?: unknown }).digest)
      : undefined;

  await reportError({
    source: "server",
    message,
    stack,
    digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
