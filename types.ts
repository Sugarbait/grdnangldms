
import { Id } from './convex/_generated/dataModel';

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  lastCheckIn: number;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: number;
  verifiedAt?: number;
  mfaEnabled: boolean;
  totpSecret?: string;
  backupCodes?: string[];
  mfaSetupRequired: boolean;
}

export interface Recipient {
  _id: Id<"recipients">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: string;
  canTriggerCheckIn: boolean;
  checkInAuthToken?: string;
  checkInAuthTokenExpiry?: number;
  checkInTokenSentAt?: number;
}

export interface SecureFile {
  _id: Id<"files">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  size: string;
  type: string;
  recipientIds: string[];
  addedDate: string;
  isEncrypted: boolean;
}

export type View = 'dashboard' | 'vault' | 'recipients' | 'settings' | 'upload' | 'add-recipient';