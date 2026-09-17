import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import superjson from "superjson";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${(import.meta.env.BASE_URL as string).replace(/\/$/, "")}/sw.js`);
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
});

const isUnauthed = (error: unknown) =>
  error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG;

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const err = event.query.state.error;
    if (!isUnauthed(err)) {
      const msg = err instanceof TRPCClientError ? err.message : "حدث خطأ في الطلب";
      toast.error(msg);
    }
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const err = event.mutation.state.error;
    if (!isUnauthed(err)) {
      const msg = err instanceof TRPCClientError ? err.message : "تعذر إتمام العملية";
      toast.error(msg);
    }
  }
});

// API base — strip trailing slash and point to /api/trpc
const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
const trpcUrl = base ? `${base}/api/trpc` : "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcUrl,
      transformer: superjson,
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
