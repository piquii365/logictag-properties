/**
 * Unified WebAuthn / passkey abstraction.
 *
 * Resolution strategy:
 *  1. Native iOS / Android (prebuilt app):  uses expo-modules-core's
 *     requireNativeModule to talk to the ReactNativePasskeys native module
 *     that is compiled in during `expo run:android` / `expo run:ios`.
 *  2. Web (react-native-web):  uses the browser's navigator.credentials API.
 *  3. Expo Go / simulator without native build:  isPasskeySupported() returns
 *     false so the passkey UI is hidden gracefully — no crash.
 *
 * We do NOT statically import react-native-passkeys here because that package's
 * build/index.js uses ESM `import` syntax and its ReactNativePasskeysModule
 * requires a compiled native binary. Metro cannot resolve it without a prebuild.
 * Instead we call expo-modules-core ourselves (same thing the library does) and
 * define every type we need locally.
 */

import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PublicKeyCredentialRequestOptionsJSON = {
  challenge: string;
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: {
    id: string;
    type: "public-key";
    transports?: string[];
  }[];
};

export type PublicKeyCredentialCreationOptionsJSON = {
  challenge: string;
  rp: { id?: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: "public-key"; alg: number }[];
  timeout?: number;
  attestation?: string;
  authenticatorSelection?: {
    residentKey?: string;
    userVerification?: string;
    authenticatorAttachment?: string;
  };
  excludeCredentials?: {
    id: string;
    type: "public-key";
    transports?: string[];
  }[];
};

export type AuthenticationResponseJSON = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  authenticatorAttachment?: string;
  clientExtensionResults: Record<string, unknown>;
  type: string;
};

export type CreationResponse = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    getPublicKey(): string | null;
  };
  authenticatorAttachment?: string;
  clientExtensionResults: Record<string, unknown>;
  type: string;
};

// ── Native module accessor ────────────────────────────────────────────────────

type NativePasskeysModule = {
  isSupported(): boolean;
  get(
    req: PublicKeyCredentialRequestOptionsJSON,
  ): Promise<AuthenticationResponseJSON | null>;
  create(req: PublicKeyCredentialCreationOptionsJSON): Promise<{
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      publicKey?: string;
    };
    authenticatorAttachment?: string;
    clientExtensionResults: Record<string, unknown>;
    type: string;
  } | null>;
};

let _nativeModule: NativePasskeysModule | null | undefined = undefined; // undefined = not tried yet

function getNativeModule(): NativePasskeysModule | null {
  if (_nativeModule !== undefined) return _nativeModule;

  if (Platform.OS === "web") {
    _nativeModule = null;
    return null;
  }

  try {
    // expo-modules-core is always available in an Expo app.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => NativePasskeysModule;
    };
    _nativeModule = requireNativeModule("ReactNativePasskeys");
  } catch {
    // Native module not linked (Expo Go, simulator without native build, etc.)
    _nativeModule = null;
  }

  return _nativeModule;
}

// ── Web (navigator.credentials) accessor ─────────────────────────────────────

type WebAuthnApi = {
  get: (
    options: PublicKeyCredentialRequestOptions,
  ) => Promise<Credential | null>;
  create: (options: CredentialCreationOptions) => Promise<Credential | null>;
};

function getWebAuthn(): WebAuthnApi | null {
  const nav = globalThis.navigator as
    | (Navigator & { credentials?: { get?: unknown; create?: unknown } })
    | undefined;
  const creds = nav?.credentials;
  if (
    creds &&
    typeof creds.get === "function" &&
    typeof creds.create === "function"
  ) {
    return creds as unknown as WebAuthnApi;
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type PasskeySupportStatus = {
  supported: boolean;
  isExpoGo: boolean;
  reason?: string;
};

/** Diagnostic status for passkey availability on the current device and platform. */
export function getPasskeySupportStatus(): PasskeySupportStatus {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as { appOwnership?: string })?.appOwnership === "expo";

  if (Platform.OS === "web") {
    const supported = getWebAuthn() !== null;
    return {
      supported,
      isExpoGo: false,
      reason: supported
        ? undefined
        : "Your web browser doesn't support WebAuthn.",
    };
  }

  // Native (Android / iOS)
  const mod = getNativeModule();
  if (mod) {
    try {
      const supported = mod.isSupported();
      return {
        supported,
        isExpoGo: false,
        reason: supported
          ? undefined
          : Platform.OS === "android"
            ? "Passkeys require Android 9 (API 28) or newer."
            : "Passkeys require iOS 16 or newer.",
      };
    } catch {
      return {
        supported: false,
        isExpoGo,
        reason: "Failed to query native passkey module.",
      };
    }
  }

  if (isExpoGo) {
    return {
      supported: false,
      isExpoGo: true,
      reason:
        "Expo Go does not include custom native modules. Native passkeys (biometrics) require a development build (`npx expo run:android`).",
    };
  }

  return {
    supported: false,
    isExpoGo: false,
    reason:
      "Passkeys native module is not linked. Please build with `npx expo run:android` or `npx expo run:ios`.",
  };
}

/** True when this runtime can perform passkey ceremonies. */
export function isPasskeySupported(): boolean {
  return getPasskeySupportStatus().supported;
}

// ── Authentication (sign-in) ──────────────────────────────────────────────────

/**
 * Runs the passkey authentication ceremony.
 * Returns the JSON assertion or `null` when the user cancels.
 * Throws on hard failure.
 */
export async function nativeGet(
  options: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON | null> {
  if (Platform.OS !== "web") {
    const mod = getNativeModule();
    if (!mod) throw new Error("Passkeys native module not available.");
    return mod.get(options);
  }

  // Web: use navigator.credentials
  const webauthn = getWebAuthn();
  if (!webauthn) throw new Error("navigator.credentials not available.");

  const creds = await webauthn.get({
    challenge: base64UrlToBuffer(options.challenge),
    ...(options.rpId ? { rpId: options.rpId } : {}),
    ...(options.timeout ? { timeout: options.timeout } : {}),
    ...(options.userVerification
      ? { userVerification: options.userVerification }
      : {}),
    ...(options.allowCredentials?.length
      ? {
          allowCredentials: options.allowCredentials.map((c) => ({
            id: base64UrlToBuffer(c.id),
            type: "public-key" as const,
          })),
        }
      : {}),
  } as PublicKeyCredentialRequestOptions);

  if (!creds) return null;
  const pk = creds as PublicKeyCredential;
  const resp = pk.response as AuthenticatorAssertionResponse;
  return {
    id: pk.id,
    rawId: bufferToBase64Url(pk.rawId),
    response: {
      clientDataJSON: bufferToBase64Url(resp.clientDataJSON),
      authenticatorData: bufferToBase64Url(resp.authenticatorData),
      signature: bufferToBase64Url(resp.signature),
      ...(resp.userHandle
        ? { userHandle: bufferToBase64Url(resp.userHandle) }
        : {}),
    },
    clientExtensionResults: {},
    type: pk.type,
  };
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Runs the passkey creation ceremony.
 * Returns the attestation response or `null` when the user cancels.
 */
export async function nativeCreate(
  options: PublicKeyCredentialCreationOptionsJSON,
): Promise<CreationResponse | null> {
  if (Platform.OS !== "web") {
    const mod = getNativeModule();
    if (!mod) throw new Error("Passkeys native module not available.");
    const raw = await mod.create(options);
    if (!raw) return null;
    return {
      ...raw,
      response: {
        ...raw.response,
        getPublicKey() {
          return raw.response.publicKey ?? null;
        },
      },
    };
  }

  // Web: use navigator.credentials
  const webauthn = getWebAuthn();
  if (!webauthn) throw new Error("navigator.credentials not available.");

  const cred = await webauthn.create({
    publicKey: {
      challenge: base64UrlToBuffer(options.challenge),
      rp: options.rp as PublicKeyCredentialRpEntity,
      user: {
        id: base64UrlToBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      pubKeyCredParams:
        options.pubKeyCredParams as PublicKeyCredentialParameters[],
      ...(options.timeout ? { timeout: options.timeout } : {}),
      ...(options.authenticatorSelection
        ? {
            authenticatorSelection:
              options.authenticatorSelection as AuthenticatorSelectionCriteria,
          }
        : {}),
      ...(options.excludeCredentials?.length
        ? {
            excludeCredentials: options.excludeCredentials.map((c) => ({
              id: base64UrlToBuffer(c.id),
              type: "public-key" as const,
            })),
          }
        : {}),
    },
  });

  if (!cred) return null;
  const pk = cred as PublicKeyCredential;
  const resp = pk.response as AuthenticatorAttestationResponse;
  const pubKeyBuf = resp.getPublicKey?.();
  const pubKeyB64 = pubKeyBuf ? bufferToBase64Url(pubKeyBuf) : null;

  return {
    id: pk.id,
    rawId: bufferToBase64Url(pk.rawId),
    response: {
      clientDataJSON: bufferToBase64Url(resp.clientDataJSON),
      attestationObject: bufferToBase64Url(resp.attestationObject),
      getPublicKey() {
        return pubKeyB64;
      },
    },
    clientExtensionResults: {},
    type: pk.type,
  };
}

// ── Encoding helpers ──────────────────────────────────────────────────────────

/** Base64url → ArrayBuffer */
export function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** ArrayBuffer → base64url */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Turns platform errors into user-friendly messages. */
export function passkeyErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
      return "Passkey sign-in was cancelled or timed out.";
    case "SecurityError":
      return "Passkeys aren't allowed on this origin. Check the app configuration.";
    case "NotSupportedError":
      return "This device doesn't support passkeys.";
    case "InvalidStateError":
      return "That passkey is already registered on this device.";
    default:
      return "Passkey sign-in failed. Try signing in with your password.";
  }
}
