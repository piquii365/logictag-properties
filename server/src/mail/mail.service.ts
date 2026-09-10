import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { ConfigService } from '../config/config.service';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Single place that knows how to talk SMTP. Every feature that needs to send
 * mail (password resets, email-change codes, notification fan-out) goes
 * through here so the transport is created once and the "is SMTP even
 * configured?" question is answered in exactly one spot.
 *
 * When SMTP is not configured the service degrades to a no-op that logs the
 * message in non-production, so flows stay testable end to end without a
 * mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return this.config.isSmtpConfigured;
  }

  /** Lazily built and cached: one pooled connection for the whole process. */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        ...(this.config.smtpUser && this.config.smtpPassword
          ? {
              auth: {
                user: this.config.smtpUser,
                pass: this.config.smtpPassword,
              },
            }
          : {}),
      });
    }
    return this.transporter;
  }

  /**
   * Sends a message. Never throws: a failed email must not roll back the
   * business action that triggered it (a reset token is still valid, a
   * notification is still stored). Failures are logged instead.
   */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `SMTP is not configured (SMTP_HOST/SMTP_FROM missing) — skipped "${message.subject}" to ${message.to}`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[mail:dev] to=${message.to}\n${message.text}`);
      }
      return false;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.config.smtpFrom,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
