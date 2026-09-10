/**
 * Thin wrapper around the platform WebAuthn API.
 *
 * React Native has no `navigator.credentials`, so passkeys only work where the
 * runtime exposes one — currently the web build (react-native-web) and any
 * native runtime that polyfills it. Everything here degrades to `null` rather
 * than throwing, so callers can hide the passkey button when unsupported.
 */

type WebAuthnApi = {
  get: (
    options: PublicKeyCredentialRequestOptions,
  ) => Promise<Credential | null>;
};

/** The subset of the WebAuthn JSON options the server returns. */
export type PublicKeyCredentialRequestOptionsJSON = {
  challenge: string;
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: { id: string; type: "public-key" }[];
};

export function getWebAuthn(): WebAuthnApi | null {
  const nav = globalThis.navigator as
    (Navigator & { credentials?: { get?: unknown } }) | undefined;
  const credentials = nav?.credentials;
  if (credentials && typeof credentials.get === "function") {
    return credentials as unknown as WebAuthnApi;
  }
  return null;
}

/** Base64url → ArrayBuffer, the encoding WebAuthn uses on the wire. */
export function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** ArrayBuffer → base64url, for sending assertions back to the server. */
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

/**
 * Converts the server's JSON options into the shape `credentials.get()`
 * expects. `PublicKeyCredentialRequestOptions.fromJSON` exists in modern
 * browsers but not everywhere, so the fields are mapped by hand.
 */
export function publicKeyCredentialRequestOptionsFromJSON(
  json: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64UrlToBuffer(json.challenge),
    ...(json.rpId ? { rpId: json.rpId } : {}),
    ...(json.timeout ? { timeout: json.timeout } : {}),
    ...(json.userVerification
      ? { userVerification: json.userVerification }
      : {}),
    ...(json.allowCredentials?.length
      ? {
          allowCredentials: json.allowCredentials.map((cred) => ({
            id: base64UrlToBuffer(cred.id),
            type: "public-key" as const,
          })),
        }
      : {}),
  };
}

/** Turns the browser's terse DOMExceptions into something a user can act on. */
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
