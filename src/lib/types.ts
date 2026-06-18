// GlennSales — Kjerne-typer

export type Company = {
  id: string;
  name: string;       // "GMC Bergen AS"
  shortName: string;  // "GMC Bergen"
  color: string;      // Tailwind-klasse for badge-farge
};

export type UserRole = 'rep' | 'leder' | 'admin';

export type User = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Innlogget brukers profil med selskapsinfo — returneres av getCurrentProfile() */
export type Profile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  company: Company | null;
};

export type MeetingStatus = 'active' | 'cancelled';

export type Meeting = {
  id: string;
  ownerUserId: string;
  companyId: string;
  customerName: string;
  startsAt: string;   // ISO 8601
  location: string;
  agenda?: string;
  status: MeetingStatus;
};

/** Møte med eier-info inkludert (unngår N+1-kall) */
export type EnrichedMeeting = Meeting & {
  ownerName: string;
  ownerCompanyShortName: string;
  ownerCompanyColor: string;
};

export type InterestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type Interest = {
  id: string;
  meetingId: string;
  userId: string;
  createdAt: string;
  status: InterestStatus;
  reviewedAt: string | null;
};

/** Interesse med interessentens bruker- og selskapsinfo */
export type EnrichedInterest = Interest & {
  userName: string;
  userEmail: string;
  userCompanyShortName: string;
  userCompanyColor: string;
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

/** Varsel med avsender- og møteinfo for visning */
export type EnrichedNotification = Notification & {
  fromUserName: string;
  fromUserCompanyShortName: string;
  meetingCustomerName: string;
};
