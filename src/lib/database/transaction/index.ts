// Export transaction management components
export * from '../transaction-service';
export * from '../profile-transaction';

// Export transaction service instance
export { transactionService } from '../transaction-service';

// Export profile transaction class
export { ProfileTransaction } from '../profile-transaction';

// Export transaction types
export type { 
  Transaction, 
  TransactionResult, 
  TransactionOperation 
} from '../transaction-service';

export type {
  BaseProfileData,
  ExpertProfileData,
  CustomerProfileData,
  ProfileCreationResult,
  UserStatusUpdate,
  AuditEvent
} from '../profile-transaction';