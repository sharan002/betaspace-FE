
export interface Conversation {
  _id?: string;
  userMsg: string;
  botReply: string;
  timestamp: string | { $date: string };
}

export interface Remark {
  _id: string;
  remark: string;
  timestamp: string | { $date: string };
  addedBy?: string;
}

export interface CampaignSend {
  _id?: string;
  campaignName: string;
  message?: string | null;
  sentAt: string | { $date: string };
  repliedAt?: string | { $date: string } | null;
}

// A bulk-Excel WhatsApp campaign contact staged before they're a real lead.
// Promoted into a Lead (and removed here) once they reply on WhatsApp.
export interface TempLead {
  _id: string;
  userName: string;
  userNumber: string;
  campaignName: string;
  message?: string | null;
  sentAt: string | { $date: string };
  status: 'sent' | 'failed';
}

export interface Installment {
  number: number;
  dueDate: string | { $date: string };
  amount: number;
  status: 'Pending' | 'Paid';
  paidAt?: string | { $date: string } | null;
  // Billing fields (optional) populated by backend when a bill is generated
  billGenerated?: boolean;
  billGeneratedAt?: string | { $date: string };
  billUrl?: string;
  billFile?: string;
}

export interface FeeStructure {
  billedAmount: number;
  billedAt?: string | { $date: string } | null;
  updatedAt?: string | { $date: string } | null;
  installments: Installment[];
}

export interface InternCertificateDetail {
  _id?: string;
  salutation?: string;
  userName?: string;
  userEmail?: string;
  phone?: string;
  reg_no?: string;
  year_of_study?: string;
  college?: string;
  college_location?: string;
  degree?: string;
  other_degree?: string;
  department?: string;
  internship?: string;
  other_internship?: string;
  workshop?: string;
  other_workshop?: string;
  start_date?: string | null;
  end_date?: string | null;
  issue_date?: string | null;
  company?: string;
  batch_code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificateResult {
  _id?: string;
  success: boolean;
  fileName: string;
  message: string;
  s3?: {
    uploaded: boolean;
    url: string;
  };
}

export interface CourseCertificateDetail {
  _id?: string;
  salutation?: string;
  userName?: string;
  course?: string;
  issue_date?: string | null;
  project_title?: string;
  intern_title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseCertificateResult {
  _id?: string;
  success: boolean;
  type: 'enrollment' | 'completion' | 'project' | 'internship' | null;
  fileName: string;
  message: string;
  s3?: {
    uploaded: boolean;
    url: string;
  };
}

export interface IdCardDetail {
  _id?: string;
  dob?: string | null;
  address?: string;
  idNo?: string;
  classStart?: string | null;
  validTill?: string | null;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdCardResult {
  success: boolean;
  fileName: string;
  message: string;
  s3?: {
    uploaded: boolean;
    url: string;
  };
}

export interface CombinedCertificateResult {
  success: boolean;
  message: string;
  url: string | null;
  fileName: string;
}

export interface User {
  _id: string;
  username: string;
  useremail: string;
  userNumber?: string;
  role: 'admin' | 'user' | 'cert' | 'hr';
}

export interface AIStrategy {
  title: string;
  probability: string;
  why: string;
  psychology: string;
  marketTrend: string;
  roi: string;
  whatsapp: string;
  nextAction: string;
}

// One-time AI-generated summary of the lead's WhatsApp bot conversation,
// shown in the Remarks tab. Generated once and never regenerated.
export interface LeadConversationSummary {
  text: string;
  generatedAt?: string | { $date: string };
  basedOnMessages?: number;
}

export interface LeadAIAnalysis {
  solutionA?: AIStrategy;
  solutionB?: AIStrategy;
  // The following properties are used in the specialized Fee Management AI Analysis view
  intentScore?: number;
  summary?: string;
  buyingSignals?: string[];
  objections?: string[];
  recommendedAction?: string;
}

export interface Lead {
  _id: string;
  userName: string;
  userNumber: string;
  course: string | null;
  courseofintrest?: string;
  leadfrom: string;
  referredBy?: string | null;
  referralCode?: string | null;
  is_referral_leader?: boolean;
  assignedto?: string;
  conversations: Conversation[];
  programType?: string;
  city?: string;
  profession: string | null;
  location: string | null;
  status: string;
  pipeline: string;
  remarks: Remark[];
  reminder: string | null | { $date: string };
  followUpCount: number;
  respondedAfterFollowUp: boolean;
  demoBooked?: boolean;
  demoBookedAt?: string | null | { $date: string };
  lastFollowUpSentAt: string | null | { $date: string };
  datecreated: string | { $date: string };
  lastInteracted: string | { $date: string };
  fees?: FeeStructure;
  aiAnalysis?: LeadAIAnalysis | null;
  aiConversationSummary?: LeadConversationSummary | null;
  InternDetails?: InternCertificateDetail[];
  certificates?: CertificateResult[];
  CourseCertDetails?: CourseCertificateDetail[];
  courseCertificates?: CourseCertificateResult[];
  IdCardDetails?: IdCardDetail[];
  idCards?: IdCardResult[];
  is_leader?: boolean;
  batchId?: string | null;
  Trainer?: string | null;
  batch_date?: string | null;
  batch_start_time?: string | null;
  batch_end_time?: string | null;
  batch_days?: string[];
  date_scheduled?: string | null;
  campaignHistory?: CampaignSend[];
  leadgenId?: string | null;
  metaCapiEvents?: MetaCapiEvent[];
  autoReassignHistory?: AutoReassignEntry[];
}

// One automatic counsellor hand-off performed by the reassignment crons
// (no-remark escalation or stale-pipeline). Drives the "Transferred Leads" view.
export interface AutoReassignEntry {
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  at?: string | { $date: string };
}

// A user-defined named bundle of dashboard leads. Stored separately from the
// leads (LeadGroup collection), so a lead can be in several groups at once.
export interface LeadGroup {
  _id: string;
  name: string;
  color: string;
  memberIds: string[];
  memberCount: number;
  createdBy?: string | null;
}

export interface LeadGroupMember {
  _id: string;
  userName: string;
  userNumber: string;
  course: string | null;
  programType?: string | null;
  leadfrom: string;
  status: string;
  pipeline: string;
  profession?: string | null;
  assignedto?: string | null;
}

export interface LeadGroupsResponse {
  success: boolean;
  groups: LeadGroup[];
  message?: string;
}

export interface LeadGroupResponse {
  success: boolean;
  group: LeadGroup;
  message?: string;
}

export interface LeadGroupMembersResponse {
  success: boolean;
  members: LeadGroupMember[];
  message?: string;
}

export interface LeadGroupSearchResponse {
  success: boolean;
  leads: LeadGroupMember[];
  message?: string;
}

// One referral-code group — the existing student (leader) plus everyone they've
// referred via the external /external/referral(/bulk) forms. The code is derived
// server-side from the leader's name + number (see buildReferralCode in the BE).
export interface ReferralGroup {
  code: string;
  leaderId: string;
  leaderName: string;
  leaderNumber: string;
  memberCount: number;
}

export interface ReferralGroupMember {
  _id: string;
  userName: string;
  userNumber: string;
  course: string | null;
  leadfrom: string;
  status: string;
  pipeline: string;
  assignedto?: string | null;
  is_referral_leader?: boolean;
  datecreated: string | { $date: string };
}

export interface ReferralGroupsResponse {
  success: boolean;
  groups: ReferralGroup[];
  message?: string;
}

export interface ReferralGroupMembersResponse {
  success: boolean;
  code: string;
  members: ReferralGroupMember[];
  message?: string;
}

export interface MetaCapiEvent {
  eventName: string;
  sentAt: string | { $date: string };
  success: boolean;
  message?: string | null;
}

export interface DashboardResponse {
  success: boolean;
  user?: User;
  leads: Lead[];
  staffs?: User[];
  message?: string;
}

export interface DashboardCounts {
  notInterestedCount: number;
  remindersCount: number;
}

export interface DashboardMetaResponse {
  success: boolean;
  user?: User;
  staffs?: User[];
  counts?: DashboardCounts;
  message?: string;
}

export interface LeadStats {
  total: number;
  cold: number;
  warm: number;
  hot: number;
  unassigned: number;
  noRemarks: number;
  responded: number;
  qualified: number;
}

export interface LeadsQueryResponse {
  success: boolean;
  leads: Lead[];
  total: number;
  stats?: LeadStats | null;
  message?: string;
}

export interface FeeMonthStat {
  year: number;
  month: number; // 0-11
  billed: number;
  paid: number;
  pending: number;
  installmentCount: number;
}

export interface FeesStatsResponse {
  success: boolean;
  months: FeeMonthStat[];
  overall?: { billed: number; paid: number; pending: number; installmentCount: number };
  message?: string;
}

export interface DailyReportLeadDetail {
  userName: string;
  userNumber: string;
  datecreated: string;
}

export interface DailyReportRemark {
  remark: string;
  timestamp: string;
  _id: string;
}

export interface DailyReportRemarksDetail {
  userName: string;
  userNumber: string;
  datecreated?: string;
  remarks: DailyReportRemark[];
}

export interface DailyReportFeeInstallment {
  number: number;
  amount: number;
  dueDate: string;
  paidAt: string;
}

export interface DailyReportFeeDetail {
  userName: string;
  userNumber: string;
  billedAmount?: number;
  paidAmount: number;
  installments: DailyReportFeeInstallment[];
}

export interface DailyReportReminderDetail {
  userName: string;
  userNumber: string;
  status: string;
  pipeline: string;
  reminder: string;
}

export interface DailyUserActivityReportItem {
  username: string;
  newLeadsToday: number;
  remarksCount: number;
  feesUpdatedToday: number;
  billedTodayTotal?: number;
  remindersTodayCount: number;
  newLeadsDetails: DailyReportLeadDetail[];
  newLeadsRemarksToday: DailyReportRemarksDetail[];
  oldLeadsRemarksToday: DailyReportRemarksDetail[];
  newLeadsWithoutRemarks: DailyReportLeadDetail[];
  remarksDetails: DailyReportRemarksDetail[];
  feeDetails: DailyReportFeeDetail[];
  remindersTodayDetails: DailyReportReminderDetail[];
}

export interface TodayUserActivityResponse {
  success: boolean;
  date: string;
  report: DailyUserActivityReportItem[];
}

export interface MonthlyReportItem {
  username: string;
  newLeads: number;
  totalRemarks: number;
  feesUpdated: number;
  totalBilled: number;
  totalPaid?: number;
  feesPaid?: number;
  totalCollected?: number;
}

export interface MonthlyReportResponse {
  success: boolean;
  year: number;
  month: number;
  report: MonthlyReportItem[];
}

export interface PipelineDistributionItem {
  label: string;
  count: number;
}

export interface PipelineDistributionResponse {
  success: boolean;
  year: number;
  month: number;
  data: PipelineDistributionItem[];
}

export interface UserMonthlyTarget {
  username: string;
  year: number;
  month: number;
  target: number;
}

export interface UserTargetsResponse {
  success: boolean;
  targets: UserMonthlyTarget[];
}

// ─── Google Analytics 4 ────────────────────────────────────────────────────

export interface GA4DateRange {
  startDate: string;
  endDate: string;
}

export interface GA4AcquisitionRow {
  channel: string;
  sessions: number;
  newUsers: number;
  totalUsers: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
}

export interface GA4AcquisitionResponse {
  success: boolean;
  dateRange: GA4DateRange;
  rows: GA4AcquisitionRow[];
  totals: { sessions: number; newUsers: number; totalUsers: number };
}

export interface GA4SessionSourceRow {
  source: string;
  sessions: number;
  newUsers: number;
  totalUsers: number;
  engagementRate: number;
  avgSessionDuration: number;
  bounceRate: number;
}

export interface GA4SessionSourceResponse {
  success: boolean;
  dateRange: GA4DateRange;
  rows: GA4SessionSourceRow[];
  totals: { sessions: number; newUsers: number; totalUsers: number };
}

export interface GA4OrganicLandingPageRow {
  landingPage: string;
  sessions: number;
  views: number;
  bounceRate: number;
  eventsPerSession: number;
  engagedSessions: number;
  conversions: number;
}

export interface GA4OrganicLandingPagesResponse {
  success: boolean;
  dateRange: GA4DateRange;
  rows: GA4OrganicLandingPageRow[];
  totals: { sessions: number; views: number; engagedSessions: number; conversions: number };
}

export interface GA4EngagementRow {
  date: string;
  activeUsers: number;
  engagedSessions: number;
  sessions: number;
  avgEngagementTimePerActiveUser: number;
  engagedSessionsPerActiveUser: number;
  avgEngagementTimePerSession: number;
}

export interface GA4EngagementOverviewResponse {
  success: boolean;
  dateRange: GA4DateRange;
  summary: {
    avgEngagementTimePerActiveUser: number;
    engagedSessionsPerActiveUser: number;
    avgEngagementTimePerSession: number;
  };
  rows: GA4EngagementRow[];
}
