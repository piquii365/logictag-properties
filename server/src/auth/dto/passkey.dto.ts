import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Start a passkey sign-in. Email is optional: without it the server issues a
 * discoverable-credential (usernameless) challenge. */
export class PasskeyLoginOptionsDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

/** Finish a passkey sign-in with the authenticator's assertion. */
export class PasskeyLoginVerifyDto {
  /** Base64url credential ID returned by the authenticator. */
  @IsString()
  credentialId!: string;

  /** Base64url clientDataJSON. */
  @IsString()
  clientDataJSON!: string;

  /** Base64url authenticatorData. */
  @IsString()
  authenticatorData!: string;

  /** Base64url signature. */
  @IsString()
  signature!: string;

  @IsOptional()
  @IsString()
  userHandle?: string;
}

/** Register a new passkey for the signed-in user. */
export class PasskeyRegisterVerifyDto {
  @IsString()
  credentialId!: string;

  @IsString()
  clientDataJSON!: string;

  @IsString()
  attestationObject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
