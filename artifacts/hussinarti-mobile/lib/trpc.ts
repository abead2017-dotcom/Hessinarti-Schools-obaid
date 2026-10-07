import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@server/routers";
import { getStoredSessionToken } from "@/lib/network";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (!domain) {
  throw new Error("EXPO_PUBLIC_DOMAIN is required to connect to the school API.");
}

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `https://${domain}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        const token = await getStoredSessionToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
      },
    }),
  ],
});
