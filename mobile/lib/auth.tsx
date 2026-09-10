import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  api,
  apiErrorMessage,
  BASE_URL,
  setRefreshHandler,
  setSessionToken,
} from "@/lib/api";
import type { UserRole } from "@/lib/roles";
import {
  bufferToBase64Url,
  getPasskeySupportStatus,
  isPasskeySupported,
  nativeCreate,
  nativeGet,
  passkeyErrorMessage,
  type PasskeySupportStatus,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@/lib/webauthn";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
};

type SessionBody = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  accessToken: string;
};

type ProfileBody = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
};

export type PasskeySummary = {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type AuthContextValue = {
  user: SessionUser | null;
  /** True until the initial silent /auth/refresh (via the httpOnly cookie) resolves. */
  booting: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  /** Opens Google's consent screen in a browser tab; resolves once signed in.
   * Resolves quietly (no throw) if the user backs out of the browser. */
  signInWithGoogle: () => Promise<void>;
  /** True when the platform exposes a WebAuthn API (web / supported devices). */
  passkeySupported: boolean;
  /** Detailed support status and diagnostics for passkeys. */
  passkeyStatus: PasskeySupportStatus;
  /** Runs the passkey ceremony and resolves once signed in. Throws a friendly
   * error when the user cancels or no passkey is available. */
  signInWithPasskey: (email?: string) => Promise<void>;
  /** Runs the passkey registration ceremony for the signed-in user. */
  registerPasskey: (deviceName?: string) => Promise<PasskeySummary>;
  /** Lists passkeys registered to the signed-in user. */
  listPasskeys: () => Promise<PasskeySummary[]>;
  /** Removes a passkey by its server ID. */
  removePasskey: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    token: string,
    newPassword: string,
  ) => Promise<void>;
  /** Stages a new email; returns the message (a code is sent to the new address). */
  requestEmailChange: (newEmail: string) => Promise<string>;
  /** Confirms a staged email change with the code sent to the new address. */
  confirmEmailChange: (token: string) => Promise<string>;
  /** Re-pulls /auth/me — call after editing the profile or avatar so the rest
   * of the app (header, more screen, ...) picks up the change. */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(): Promise<SessionUser> {
  const profile = await api<ProfileBody>("/auth/me");
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const body = await api<SessionBody>("/auth/refresh", {
        method: "POST",
        skipAuth: true,
      });
      setSessionToken(body.accessToken);
      setUser(await loadProfile());
      return true;
    } catch {
      setSessionToken(null);
      setUser(null);
      return false;
    }
  }, []);

  // Wire the api client's 401-retry loop to this context's refresh, once.
  useEffect(() => {
    setRefreshHandler(refresh);
    return () => setRefreshHandler(null);
  }, [refresh]);

  // On app launch, the refresh cookie (if any) is the only thing that can
  // resume a session — there's no persisted access token to check first.
  useEffect(() => {
    refresh().finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // The server's local strategy reads the identifier from `user`, not `email`.
    const body = await api<SessionBody>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: { user: email, password },
    });
    setSessionToken(body.accessToken);
    setUser(await loadProfile());
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const body = await api<SessionBody>("/auth/register", {
      method: "POST",
      skipAuth: true,
      body: input,
    });
    setSessionToken(body.accessToken);
    setUser(await loadProfile());
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // The server redirects back to `${CLIENT_ORIGIN}/auth/callback?accessToken=...`
    // once Google's consent screen completes — CLIENT_ORIGIN has to be set to
    // this app's own scheme (e.g. logictagpropertiesmobile://) for that
    // redirect to land back in the app instead of a browser dead end.
    const redirectUrl = Linking.createURL("auth/callback");
    const result = await WebBrowser.openAuthSessionAsync(
      `${BASE_URL}/auth/google`,
      redirectUrl,
    );

    if (result.type !== "success") {
      // User closed the browser or backed out — not an error worth surfacing.
      return;
    }

    const { queryParams } = Linking.parse(result.url);
    const accessToken = queryParams?.accessToken;
    if (typeof accessToken !== "string") {
      throw new Error(
        "Google sign-in didn't return a valid session. Please try again.",
      );
    }

    setSessionToken(accessToken);
    try {
      setUser(await loadProfile());
    } catch (err) {
      setSessionToken(null);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ponytail: sign the client out locally regardless — a failed logout
      // call shouldn't strand the user in a screen they can't leave.
    } finally {
      setSessionToken(null);
      setUser(null);
    }
  }, []);

  const signInWithPasskey = useCallback(async (email?: string) => {
    if (!isPasskeySupported()) {
      throw new Error(
        "Passkeys aren't available on this device. Try signing in with your password.",
      );
    }

    // 1. Ask the server for a challenge (and, when we know the email, the
    //    list of credentials to offer).
    const options = await api<PublicKeyCredentialRequestOptionsJSON>(
      "/auth/passkey/login/options",
      {
        method: "POST",
        skipAuth: true,
        body: { email: email?.trim() || undefined },
      },
    );

    // 2. Hand it to the platform authenticator.
    //    react-native-passkeys accepts the server's JSON options directly —
    //    no manual ArrayBuffer conversion required.
    let assertion: Awaited<ReturnType<typeof nativeGet>>;
    try {
      assertion = await nativeGet(options);
    } catch (err) {
      throw new Error(passkeyErrorMessage(err));
    }
    if (!assertion) {
      throw new Error("Passkey sign-in was cancelled.");
    }

    // 3. Send the assertion back for verification; the server issues a session.
    //    On native the response fields are already base64url strings.
    //    On web they are also base64url strings (react-native-passkeys web shim
    //    handles the encoding), so the same path works everywhere.
    const body = await api<SessionBody>("/auth/passkey/login/verify", {
      method: "POST",
      skipAuth: true,
      body: {
        credentialId: assertion.id,
        clientDataJSON: assertion.response.clientDataJSON,
        authenticatorData: assertion.response.authenticatorData,
        signature: assertion.response.signature,
        ...(assertion.response.userHandle
          ? { userHandle: assertion.response.userHandle }
          : {}),
      },
    });
    setSessionToken(body.accessToken);
    setUser(await loadProfile());
  }, []);

  const registerPasskey = useCallback(
    async (deviceName?: string): Promise<PasskeySummary> => {
      if (!isPasskeySupported()) {
        throw new Error("Passkeys aren't supported on this device.");
      }

      // 1. Fetch registration options from the server (requires auth).
      const options = await api<PublicKeyCredentialCreationOptionsJSON>(
        "/auth/passkey/register/options",
        { method: "POST" },
      );

      // 2. Run the native creation ceremony.
      let credential: Awaited<ReturnType<typeof nativeCreate>>;
      try {
        credential = await nativeCreate(options);
      } catch (err) {
        throw new Error(passkeyErrorMessage(err));
      }
      if (!credential) {
        throw new Error("Passkey registration was cancelled.");
      }

      // 3. Send the attestation back to the server.
      //    On native, getPublicKey() returns a Base64URLString; on web it also
      //    returns Base64URLString (the library normalises it).
      const summary = await api<PasskeySummary>(
        "/auth/passkey/register/verify",
        {
          method: "POST",
          body: {
            credentialId: credential.id,
            clientDataJSON: credential.response.clientDataJSON,
            attestationObject: credential.response.attestationObject,
            deviceName: deviceName?.trim() || undefined,
          },
        },
      );
      return summary;
    },
    [],
  );

  const listPasskeys = useCallback(async (): Promise<PasskeySummary[]> => {
    return api<PasskeySummary[]>("/auth/passkey");
  }, []);

  const removePasskey = useCallback(async (id: string): Promise<void> => {
    await api(`/auth/passkey/${id}`, { method: "DELETE" });
  }, []);

  const passkeyStatus = useMemo(() => getPasskeySupportStatus(), []);
  const passkeySupported = passkeyStatus.supported;

  const forgotPassword = useCallback(async (email: string) => {
    await api("/auth/forgot-password", {
      method: "POST",
      skipAuth: true,
      body: { email },
    });
  }, []);

  const resetPassword = useCallback(
    async (email: string, token: string, newPassword: string) => {
      await api("/auth/reset-password", {
        method: "POST",
        skipAuth: true,
        body: { email, token, newPassword },
      });
    },
    [],
  );

  const requestEmailChange = useCallback(async (newEmail: string) => {
    const res = await api<{ message: string }>("/auth/email/request-change", {
      method: "POST",
      body: { newEmail },
    });
    return res.message;
  }, []);

  const confirmEmailChange = useCallback(async (token: string) => {
    const res = await api<{ message: string; email: string }>(
      "/auth/email/confirm-change",
      {
        method: "POST",
        skipAuth: true,
        body: { token },
      },
    );
    return res.email;
  }, []);

  const refreshProfile = useCallback(async () => {
    setUser(await loadProfile());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      booting,
      signIn,
      signUp,
      signInWithGoogle,
      passkeySupported,
      passkeyStatus,
      signInWithPasskey,
      registerPasskey,
      listPasskeys,
      removePasskey,
      signOut,
      forgotPassword,
      resetPassword,
      requestEmailChange,
      confirmEmailChange,
      refreshProfile,
    }),
    [
      user,
      booting,
      signIn,
      signUp,
      signInWithGoogle,
      passkeySupported,
      passkeyStatus,
      signInWithPasskey,
      registerPasskey,
      listPasskeys,
      removePasskey,
      signOut,
      forgotPassword,
      resetPassword,
      requestEmailChange,
      confirmEmailChange,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Re-exported so existing screens can keep importing it from here. */
export const authErrorMessage = apiErrorMessage;
