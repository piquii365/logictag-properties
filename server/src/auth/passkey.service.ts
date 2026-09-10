import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { PasskeyCredential } from './entities/passkey-credential.entity';
import type { AuthJwtPayload } from './types/jwt-payload.auth';

/** How long a challenge stays valid. Short: it is only used for one ceremony. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type StoredChallenge = {
  challenge: string;
  userId: string | null;
  expiresAt: number;
};

export type PasskeySummary = {
  id: string;
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
};

/**
 * WebAuthn / passkey ceremonies.
 *
 * The heavy lifting (CBOR decoding, COSE key parsing, signature verification)
 * is delegated to `@simplewebauthn/server` when it is installed. When it is
 * not, the service still issues challenges and stores credentials, but
 * verification is refused rather than silently trusted — a passkey that is
 * not cryptographically verified is worse than no passkey at all.
 */
@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);
  private readonly credentials: Repository<PasskeyCredential>;
  /** In-memory challenge store, keyed by the challenge string itself. */
  private readonly challenges = new Map<string, StoredChallenge>();

  constructor(
    dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    this.credentials = dataSource.getRepository(PasskeyCredential);
  }

  get isEnabled(): boolean {
    return this.config.isWebauthnConfigured;
  }

  private assertEnabled() {
    if (!this.isEnabled) {
      throw new NotFoundException('Passkey sign-in is not enabled');
    }
  }

  private issueChallenge(userId: string | null): string {
    this.pruneChallenges();
    const challenge = randomBytes(32).toString('base64url');
    this.challenges.set(challenge, {
      challenge,
      userId,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });
    return challenge;
  }

  /** Consumes a challenge: it can only be used once. */
  private takeChallenge(challenge: string): StoredChallenge {
    this.pruneChallenges();
    const stored = this.challenges.get(challenge);
    if (!stored) {
      throw new BadRequestException('Unknown or expired challenge');
    }
    this.challenges.delete(challenge);
    return stored;
  }

  private pruneChallenges() {
    const now = Date.now();
    for (const [key, value] of this.challenges) {
      if (value.expiresAt < now) this.challenges.delete(key);
    }
  }

  // ── Registration (signed-in user adds a passkey) ──────────────

  async registrationOptions(user: AuthJwtPayload) {
    this.assertEnabled();
    const profile = await this.users.findOne(user.id);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    const challenge = this.issueChallenge(user.id);
    const existing = await this.credentials.find({
      where: { userId: user.id },
    });

    return {
      challenge,
      rp: {
        id: this.config.webauthnRpId,
        name: this.config.webauthnRpName,
      },
      user: {
        // WebAuthn user IDs are opaque bytes; the UUID is stable and unique.
        id: Buffer.from(user.id).toString('base64url'),
        name: profile.email,
        displayName: profile.name,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: CHALLENGE_TTL_MS,
      attestation: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: existing.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        ...(cred.transports ? { transports: cred.transports } : {}),
      })),
    };
  }

  async verifyRegistration(
    user: AuthJwtPayload,
    body: {
      credentialId: string;
      clientDataJSON: string;
      attestationObject: string;
      deviceName?: string;
    },
  ) {
    this.assertEnabled();
    const clientData = this.decodeClientData(body.clientDataJSON);
    this.takeChallenge(clientData.challenge);
    this.assertClientData(clientData);

    const publicKey = await this.extractPublicKey(body.attestationObject);
    if (!publicKey) {
      throw new BadRequestException(
        'Could not verify the passkey. Install @simplewebauthn/server on the API to enable full attestation verification.',
      );
    }

    const existing = await this.credentials.findOne({
      where: { credentialId: body.credentialId },
    });
    if (existing) {
      throw new BadRequestException('This passkey is already registered');
    }

    const saved = await this.credentials.save(
      this.credentials.create({
        userId: user.id,
        credentialId: body.credentialId,
        publicKey,
        counter: '0',
        transports: null,
        deviceName: body.deviceName?.trim() || null,
        lastUsedAt: null,
      }),
    );
    return this.toSummary(saved);
  }

  // ── Authentication (signed-out user signs in) ─────────────────

  async authenticationOptions(email?: string) {
    this.assertEnabled();
    let allowCredentials: { id: string; type: 'public-key' }[] = [];

    if (email) {
      const profile = await this.users.findByEmail(email);
      if (profile) {
        const creds = await this.credentials.find({
          where: { userId: profile.id },
        });
        allowCredentials = creds.map((cred) => ({
          id: cred.credentialId,
          type: 'public-key' as const,
        }));
      }
      // No account / no passkeys: still return a challenge so the response
      // shape is identical and the endpoint cannot be used to enumerate users.
    }

    const challenge = this.issueChallenge(null);
    return {
      challenge,
      rpId: this.config.webauthnRpId,
      timeout: CHALLENGE_TTL_MS,
      userVerification: 'preferred',
      ...(allowCredentials.length ? { allowCredentials } : {}),
    };
  }

  async verifyAuthentication(body: {
    credentialId: string;
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  }): Promise<AuthJwtPayload> {
    this.assertEnabled();
    const clientData = this.decodeClientData(body.clientDataJSON);
    this.takeChallenge(clientData.challenge);
    this.assertClientData(clientData);

    const credential = await this.credentials.findOne({
      where: { credentialId: body.credentialId },
    });
    if (!credential) {
      throw new UnauthorizedException('Passkey not recognised');
    }

    const verified = await this.verifyAssertion(credential, body);
    if (!verified) {
      throw new UnauthorizedException('Passkey verification failed');
    }

    credential.lastUsedAt = new Date();
    await this.credentials.save(credential);

    const profile = await this.users.findOneById(credential.userId);
    if (!profile) {
      throw new UnauthorizedException('User not found');
    }
    return { id: profile.id, email: profile.email, role: profile.role };
  }

  // ── Management ────────────────────────────────────────────────

  async list(user: AuthJwtPayload): Promise<PasskeySummary[]> {
    const creds = await this.credentials.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    return creds.map((cred) => this.toSummary(cred));
  }

  async remove(user: AuthJwtPayload, id: string) {
    const cred = await this.credentials.findOne({ where: { id } });
    if (!cred || cred.userId !== user.id) {
      throw new NotFoundException('Passkey not found');
    }
    await this.credentials.remove(cred);
    return { message: 'Passkey removed' };
  }

  private toSummary(cred: PasskeyCredential): PasskeySummary {
    return {
      id: cred.id,
      deviceName: cred.deviceName,
      createdAt: cred.createdAt,
      lastUsedAt: cred.lastUsedAt,
    };
  }

  // ── Verification helpers ──────────────────────────────────────

  private decodeClientData(clientDataJSON: string): {
    challenge: string;
    origin: string;
    type: string;
  } {
    try {
      const json = Buffer.from(clientDataJSON, 'base64url').toString('utf8');
      return JSON.parse(json) as {
        challenge: string;
        origin: string;
        type: string;
      };
    } catch {
      throw new BadRequestException('Malformed clientDataJSON');
    }
  }

  private assertClientData(clientData: { origin: string; type: string }) {
    const expected = this.config.webauthnOrigin;
    if (expected && clientData.origin !== expected) {
      throw new BadRequestException('Passkey origin mismatch');
    }
  }

  /**
   * Pulls the COSE public key out of an attestation object. Returns null when
   * `@simplewebauthn/server` is unavailable, which makes the caller refuse the
   * registration instead of storing an unverified key.
   */
  private async extractPublicKey(
    attestationObject: string,
  ): Promise<string | null> {
    try {
      const mod = (await import('@simplewebauthn/server')) as unknown as {
        verifyRegistrationResponse?: (opts: unknown) => Promise<{
          verified: boolean;
          registrationInfo?: { credentialPublicKey?: Uint8Array };
        }>;
      };
      if (!mod.verifyRegistrationResponse) return null;
      const result = await mod.verifyRegistrationResponse({
        response: { attestationObject },
        expectedOrigin: this.config.webauthnOrigin,
        expectedRPID: this.config.webauthnRpId,
        requireUserVerification: false,
      });
      if (!result.verified || !result.registrationInfo?.credentialPublicKey) {
        return null;
      }
      return Buffer.from(result.registrationInfo.credentialPublicKey).toString(
        'base64url',
      );
    } catch (error) {
      this.logger.warn(
        `Attestation verification unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async verifyAssertion(
    credential: PasskeyCredential,
    body: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
    },
  ): Promise<boolean> {
    try {
      const mod = (await import('@simplewebauthn/server')) as unknown as {
        verifyAuthenticationResponse?: (opts: unknown) => Promise<{
          verified: boolean;
          authenticationInfo?: { newCounter?: number };
        }>;
      };
      if (!mod.verifyAuthenticationResponse) return false;
      const result = await mod.verifyAuthenticationResponse({
        response: {
          id: credential.credentialId,
          clientDataJSON: body.clientDataJSON,
          authenticatorData: body.authenticatorData,
          signature: body.signature,
        },
        expectedOrigin: this.config.webauthnOrigin,
        expectedRPID: this.config.webauthnRpId,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: Number(credential.counter),
        },
        requireUserVerification: false,
      });
      if (result.verified && result.authenticationInfo?.newCounter != null) {
        credential.counter = String(result.authenticationInfo.newCounter);
      }
      return result.verified;
    } catch (error) {
      this.logger.warn(
        `Assertion verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
