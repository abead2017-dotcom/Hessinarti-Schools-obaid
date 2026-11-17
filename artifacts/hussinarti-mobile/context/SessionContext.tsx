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
  restoring: boolean;
  restoreError: boolean;
  retryRestore: () => void;
  completeLogin: (response: MobileLogin200) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const RESTORE_TIMEOUT_MS = 8_000;

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 401
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileLogin200User | null>(null);
  const [ready, setReady] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    let timedOut = false;
    const controller = new AbortController();
    setReady(false);
    setRestoring(true);
    setRestoreError(false);

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      if (mounted) {
        // Never treat a slow/offline server as proof that the saved token is invalid.
        setRestoreError(true);
        setRestoring(false);
        setReady(true);
      }
    }, RESTORE_TIMEOUT_MS);

    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        if (!token) {
          if (mounted) setUser(null);
          return;
        }

        if (controller.signal.aborted) return;
        const profile = await getMobileAuthMe({ signal: controller.signal });
        if (mounted && !controller.signal.aborted) {
          setUser(profile);
          setRestoreError(false);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          // Remove only a token the server has explicitly rejected.
          await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => undefined);
          if (mounted) {
            setUser(null);
            setRestoreError(false);
          }
        } else if (mounted && !timedOut && !controller.signal.aborted) {
          // Keep the saved token and give the user a retry path for network/storage errors.
          setRestoreError(true);
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setRestoring(false);
          setReady(true);
        }
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [restoreAttempt]);

  const retryRestore = useCallback(() => {
    setRestoreError(false);
    setReady(false);
    setRestoring(true);
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const completeLogin = useCallback(
    async (response: MobileLogin200) => {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, response.token);
      queryClient.clear();
      setRestoreError(false);
      setUser(response.user);
      setReady(true);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    } finally {
      queryClient.clear();
      setRestoreError(false);
      setUser(null);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, ready, restoring, restoreError, retryRestore, completeLogin, signOut }),
    [user, ready, restoring, restoreError, retryRestore, completeLogin, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider.");
  return value;
}
