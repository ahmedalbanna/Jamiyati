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
