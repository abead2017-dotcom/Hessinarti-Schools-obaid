import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";

export const SESSION_TOKEN_KEY = "hussinarti.mobile.session";

export async function getStoredSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

const domain = process.env.EXPO_PUBLIC_DOMAIN;
setBaseUrl(domain ? `https://${domain}` : null);
setAuthTokenGetter(getStoredSessionToken);
