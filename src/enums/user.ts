export enum USER_ROLES {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  OPERATOR='OPERATOR'
}
export enum USER_STATUS {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
  // Operator-only: the working status an operator reaches after admin
  // confirms their identity/bank details (see operator.service.ts
  // verifyOperator). USER/ADMIN accounts never use this value.
  VERIFIED = 'verified',
}
