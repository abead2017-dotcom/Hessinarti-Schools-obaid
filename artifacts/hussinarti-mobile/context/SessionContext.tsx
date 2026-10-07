import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMobileAuthMe,
  type MobileLogin200,
  type MobileLogin200User,
} from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import { SESSION_TOKEN_KEY } from "@/lib/network";

type SessionContextValue = {
  user: MobileLogin200User | null;
  ready: boolean;
  completeLogin: (response: MobileLogin200) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileLogin200User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        if (token) {
          const profile = await getMobileAuthMe();
          if (mounted) setUser(profile);
        }
      } catch {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => undefined);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setReady(true);
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const completeLogin = useCallback(
    async (response: MobileLogin200) => {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, response.token);
      queryClient.clear();
      setUser(response.user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    } finally {
      queryClient.clear();
      setUser(null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, ready, completeLogin, signOut }),
    [user, ready, completeLogin, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider.");
  return value;
}
