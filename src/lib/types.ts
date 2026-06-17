// GlennSales — Kjerne-typer

export type Company = {
  id: string;
  name: string;      // "GMC Bergen AS"
  shortName: string; // "GMC Bergen"
  color: string;     // Tailwind-klasse for badge-farge
};

export type UserRole = 'rep' | 'leder';

export type User = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
};

export type MeetingStatus = 'active' | 'cancelled';

export type Meeting = {
  id: string;
  ownerUserId: string;
  companyId: string;
  customerName: string;
  startsAt: string;  // ISO 8601
  location: string;
  agenda?: string;
  status: MeetingStatus;
};

export type InterestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type Interest = {
  id: string;
  meetingId: string;
  userId: string;
  createdAt: string;
  status: InterestStatus;
  reviewedAt: string | null; // settes av eier ved godkjenning/avslag
};

export type NotificationType =
  | 'new_interest'       // til møteeier: noen har meldt interesse
  | 'interest_approved'  // til interessenten: eier godkjente
  | 'interest_rejected'; // til interessenten: eier avslo

export type Notification = {
  id: string;
  recipientUserId: string;
  fromUserId: string;
  meetingId: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
};
