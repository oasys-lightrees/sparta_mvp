// Shared domain types mirroring the backend API responses.

export type Role = 'USER' | 'MENTOR' | 'ADMIN';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED';
export type ContactStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type ReportType = 'FREE' | 'PREMIUM';

export type User = {
  id: string;
  email: string;
  role: Role;
};

export type AuthResult = {
  token: string;
  user: User;
};

// --- Public assessment ---
export type AssessmentSummary = {
  id: string;
  title: string;
  description: string | null;
  price: number;
};

export type PublicChoice = { id: string; text: string };
export type PublicQuestion = {
  id: string;
  question: string;
  choices: PublicChoice[];
};
export type AssessmentDetail = AssessmentSummary & {
  questions: PublicQuestion[];
};

// --- Submission / attempt ---
export type Answer = { question_id: string; choice_id: string };
export type SubmitResult = { attempt_id: string; requires_auth: boolean };
export type ClaimResult = { attempt_id: string };
export type Report = { type: ReportType; content: string };
export type PremiumInfo = {
  cost: number;
  description: string | null;
  unlocked: boolean;
  content: string | null;
};
export type AttemptReport = {
  attempt_id: string;
  score: number;
  level: string;
  assessment_title: string | null;
  report_id: string;
  report: Report;
  premium: PremiumInfo;
};

export type MyAttempt = {
  attempt_id: string;
  assessment_id: string;
  assessment_title: string;
  premium_token_cost: number;
  score: number;
  created_at: string;
  report_id: string | null;
  report_type: ReportType | null;
  report_content: string | null;
  premium_unlocked: boolean;
  premium_content: string | null;
};

// --- Tokens ---
export type TokenBalance = { balance: number };
export type UnlockResult = {
  report_id: string;
  type: ReportType;
  content: string;
  charged: number;
  already_unlocked: boolean;
};

// --- Mentor ---
export type MentorStats = {
  totalAssessments: number;
  publishedAssessments: number;
  draftAssessments: number;
  totalAttempts: number;
  averageScore: number;
};

export type MentorAssessmentListItem = {
  id: string;
  title: string;
  status: AssessmentStatus;
  price: number;
  totalAttempts: number;
};

export type MentorChoice = { id: string; choice_text: string; score: number };
export type MentorQuestion = {
  id: string;
  question_text: string;
  correct_answer: string | null;
  explanation: string | null;
  choices: MentorChoice[];
};

// AI question import preview (not yet saved).
export type AIChoice = { text: string; score: number };
export type AIQuestionPreview = {
  question: string;
  choices: AIChoice[];
  correct_answer: string;
  explanation: string;
};
export type MentorAssessmentDetail = {
  id: string;
  title: string;
  description: string | null;
  status: AssessmentStatus;
  free_report_text: string | null;
  low_score_threshold: number | null;
  high_score_threshold: number | null;
  price: number;
  premium_token_cost: number;
  free_report_template: string | null;
  premium_report_description: string | null;
  email_template: string | null;
  base_knowledge: string | null;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
  questions: MentorQuestion[];
};

export type MentorResult = {
  email: string | null;
  score: number;
  created_at: string;
};

export type MentorRevenueTxn = {
  assessmentTitle: string | null;
  amount: number;
  date: string;
};
export type MentorRevenue = {
  totalRevenue: number;
  premiumUnlocks: number;
  transactions: MentorRevenueTxn[];
};

// --- Analytics (charts) ---
export type ChartPoint = { name: string; value: number };

export type MentorAnalytics = {
  assessmentPerformance: { name: string; attempts: number }[];
  revenueByDate: { date: string; tokens: number }[];
  scoreDistribution: ChartPoint[];
  conversionFunnel: { stage: string; value: number }[];
};

export type AdminAnalytics = {
  platformGrowth: ChartPoint[];
  revenueOverview: ChartPoint[];
  activityOverTime: { date: string; submissions: number }[];
};

// --- Admin ---
export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  token_balance: number;
  created_at: string;
};

export type AdminStats = {
  totalUsers: number;
  totalAssessments: number;
  totalAttempts: number;
  potentialRevenue: number;
};

export type AdminAssessment = {
  id: string;
  title: string;
  status: AssessmentStatus;
  price: number;
  mentor_email: string;
  totalAttempts: number;
};

export type AdminContact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  created_at: string;
};

// --- Blogs ---
export type BlogSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  created_at: string;
};

export type BlogDetail = BlogSummary & {
  content: string | null;
  updated_at: string;
};
