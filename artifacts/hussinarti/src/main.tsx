import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return false;
  if (typeof window === "undefined") return false;
  if (error.message !== UNAUTHED_ERR_MSG) return false;
  window.location.href = getLoginUrl();
  return true;
};

const notifyUserOfError = (error: unknown, kind: "query" | "mutation") => {
  console.error(`[API ${kind === "query" ? "Query" : "Mutation"} Error]`, error);
  if (redirectToLoginIfUnauthorized(error)) return;
  const message =
    error instanceof TRPCClientError && error.message
      ? error.message
      : "تعذر إتمام العملية، يرجى المحاولة مرة أخرى.";
  toast.error(message);
};

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    notifyUserOfError(event.query.state.error, "query");
  }
});
queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    notifyUserOfError(event.mutation.state.error, "mutation");
  }
});

// Use the API server path — works in both dev and prod
const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBase}/api/trpc`.replace("//api", "/api"),
      transformer: superjson,
      headers() {
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find((s) => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) return { Authorization: `Bearer ${token}` };
          }
        } catch {}
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
