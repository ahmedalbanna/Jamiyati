export interface Association {
  id?: string;
  name: string;
  totalAmount: number;
  monthlyContribution: number;
  memberCount: number;
  startDate: string;
  status: 'active' | 'completed';
  directorUid: string;
  rotationOrder: string[];
  isEmergencyFund?: boolean;
  notificationSound?: string;
}

export interface Member {
  id?: string;
  associationId: string;
  uid?: string;
  name: string;
  phone: string;
  voiceAgreement?: string;
  role: 'admin' | 'member';
  joinedAt?: string;
  notificationSound?: string;
}

export interface Payment {
  id?: string;
  associationId: string;
  memberId: string;
  month: string;
  amount: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  voiceConfirmation?: string;
}

export interface Payout {
  id?: string;
  associationId: string;
  memberId: string;
  month: string;
  amount: number;
  status: 'pending' | 'received';
  receivedAt?: string;
  voiceReceipt?: string;
}

export interface Dispute {
  id?: string;
  associationId: string;
  reporterId: string;
  targetId?: string;
  status: 'open' | 'resolved';
  title: string;
  description: string;
  voiceStatement?: string;
  voiceResponse?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id?: string;
  userId: string;
  associationId: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

