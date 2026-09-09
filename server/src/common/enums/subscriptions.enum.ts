export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum TrialStatus {
  ACTIVE = 'active',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
}
