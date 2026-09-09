export enum ChargeStatus {
  OUTSTANDING = 'outstanding',
  PART_PAID = 'part_paid',
  PAID = 'paid',
  VOIDED = 'voided',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  CARD = 'card',
  CREDIT = 'credit',
}

export enum PaymentProvider {
  PESEPAY = 'pesepay',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  INITIATED = 'initiated',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  EXPIRED = 'expired',
  REVERSED = 'reversed',
}
