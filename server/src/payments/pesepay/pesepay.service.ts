import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { PesepaySecurity } from './pesepay-security';

const BASE_URL = 'https://api.pesepay.com/api/payments-engine/';

export type PesepayPaymentMethod = {
  code: string;
  name: string;
  description: string;
  active: boolean;
  currencies: string[];
};

export type PesepayTransaction = {
  referenceNumber: string;
  merchantReference: string;
  pollUrl: string;
  redirectUrl: string;
  transactionStatus: string;
};

/**
 * Thin client for PesePay's payments-engine API (Zimbabwe mobile money /
 * card gateway). Docs: https://developers.pesepay.com — verified against
 * their published JS SDK, since the docs site itself is JS-rendered.
 *
 * Disabled (every method throws) until PESEPAY_INTEGRATION_KEY and
 * PESEPAY_ENCRYPTION_KEY are set; PaymentsController gates its pesepay
 * routes on `configService.isPesepayConfigured` before ever calling this.
 */
@Injectable()
export class PesepayService {
  constructor(private readonly config: ConfigService) {}

  private security(): PesepaySecurity {
    return new PesepaySecurity(this.config.pesepayEncryptionKey!);
  }

  private headers(): Record<string, string> {
    return {
      authorization: this.config.pesepayIntegrationKey!,
      'content-type': 'application/json',
    };
  }

  async getPaymentMethods(currencyCode: string): Promise<PesepayPaymentMethod[]> {
    const res = await fetch(
      `${BASE_URL}v1/payment-methods/for-currency?currencyCode=${encodeURIComponent(currencyCode)}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      throw new ServiceUnavailableException('PesePay is unavailable right now');
    }
    return res.json() as Promise<PesepayPaymentMethod[]>;
  }

  /** Seamless (no redirect) mobile-money payment: the customer approves it
   * on their phone, and the caller polls `checkStatus` for the outcome. */
  async initiateSeamlessPayment(input: {
    amount: number;
    currencyCode: string;
    merchantReference: string;
    reasonForPayment: string;
    phoneNumber: string;
    paymentMethodCode: string;
    email?: string;
    name?: string;
  }): Promise<PesepayTransaction> {
    const payload = this.security().encrypt({
      amountDetails: { amount: input.amount, currencyCode: input.currencyCode },
      merchantReference: input.merchantReference,
      reasonForPayment: input.reasonForPayment,
      resultUrl: this.config.pesepayResultUrl,
      paymentMethodCode: input.paymentMethodCode,
      customer: {
        phoneNumber: input.phoneNumber,
        email: input.email,
        name: input.name,
      },
      // ponytail: some payment methods declare extra requiredFields beyond
      // phone/email/name (see PesepayPaymentMethod.requiredFields, not yet
      // surfaced here) — wire those through if a method actually needs them.
      paymentMethodRequiredFields: {},
    });

    const res = await fetch(`${BASE_URL}v2/payments/make-payment`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ payload }),
    });
    const body = (await res.json()) as { payload?: string; message?: string };
    if (!res.ok || !body.payload) {
      throw new ServiceUnavailableException(
        body.message ?? 'PesePay rejected the payment request',
      );
    }
    return this.security().decrypt<PesepayTransaction>(body.payload);
  }

  async checkStatus(referenceNumber: string): Promise<PesepayTransaction> {
    const res = await fetch(
      `${BASE_URL}v1/payments/check-payment?referenceNumber=${encodeURIComponent(referenceNumber)}`,
      { headers: this.headers() },
    );
    const body = (await res.json()) as { payload?: string; message?: string };
    if (!res.ok || !body.payload) {
      throw new ServiceUnavailableException(
        body.message ?? "Couldn't reach PesePay to check payment status",
      );
    }
    return this.security().decrypt<PesepayTransaction>(body.payload);
  }
}
