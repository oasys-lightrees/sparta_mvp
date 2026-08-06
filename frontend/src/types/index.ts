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

// --- Access model ---
// How an assessment gates *starting*. Config-driven; see backend config/access.ts.
export type AccessMode = 'FREE' | 'FREEMIUM' | 'PAID' | 'VOUCHER';

// Resolved access state for the current viewer — drives the take-flow CTA.
export type AccessState = {
  assessment_id: string;
  mode: AccessMode;
  start_requires_grant: boolean;
  requires_auth_to_start: boolean;
  grant_via: 'payment' | 'voucher' | null;
  premium_unlockable: boolean;
  access_token_cost: number;
  premium_token_cost: number;
  price: number;
  has_access: boolean;
  token_balance: number | null;
};
export type PurchaseAccessResult = AccessState & {
  charged: number;
  already_purchased: boolean;
};

// --- Public assessment ---
export type AssessmentSummary = {
  id: string;
  title: string;
  description: string | null;
  imageUrl?: string | null;
  price: number;
  accessMode?: AccessMode | null;
  accessTokenCost?: number;
};

// --- Learning resources ---
// Extensible resource kinds — not video-only. New kinds are additive.
export type LearningResourceType =
  | 'video'
  | 'pdf'
  | 'article'
  | 'file'
  | 'link'
  | 'course';
export type LearningResourceAccess = 'free' | 'premium';
export type VideoProvider = 'youtube' | 'vimeo' | 'mp4' | 'file' | 'external';
export type LearningResource = {
  id: string;
  type: LearningResourceType;
  title: string;
  description: string;
  url: string;
  access: LearningResourceAccess;
  // Optional video metadata (ignored for non-video types).
  provider?: VideoProvider | null;
  thumbnailUrl?: string | null;
  durationLabel?: string;
  meta?: Record<string, unknown>;
};
// The mentor-authored library attached to an assessment: shared resources shown
// for every result, plus resources keyed by result profile (a result-category
// code, or a score level like "Beginner").
export type LearningResourcesDoc = {
  version: 1;
  shared: LearningResource[];
  byProfile: Record<string, LearningResource[]>;
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
  // Mentor-provided study video, revealed only once premium is unlocked.
  study_video_url: string | null;
  // Count of premium learning resources still hidden behind the paywall.
  locked_resources: number;
};
export type AttemptReport = {
  attempt_id: string;
  score: number;
  level: string;
  assessment_title: string | null;
  access_mode: AccessMode;
  // Winning result profile for personality assessments (code + name); null for
  // score-based assessments. Powers the personalized learning header.
  result_profile: { code: string; name: string } | null;
  report_id: string;
  report: Report;
  // Learning resources visible for this result (free always; premium after unlock).
  learning_resources: LearningResource[];
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
export type TokenPricing = {
  token_price_idr: number;
  currency: string;
  // When false the gateway isn't configured — purchases credit instantly (demo).
  payment_configured: boolean;
};
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
// Result of starting a token purchase. When the payment gateway is not
// configured the backend credits immediately and returns the 'demo' variant.
export type PurchaseResult =
  | { mode: 'demo'; balance: number }
  | {
      mode: 'midtrans';
      order_id: string;
      token: string;
      redirect_url: string;
      client_key: string;
      gross_amount: number;
    };
export type TokenOrderStatus = {
  order_id: string;
  status: PaymentStatus;
  token_amount: number;
  balance: number;
};
export type UnlockResult = {
  report_id: string;
  type: ReportType;
  content: string;
  charged: number;
  already_unlocked: boolean;
};

// --- Vouchers (company packages) ---
export type VoucherBatchSummary = {
  batch_id: string;
  company_name: string;
  credits: number;
  created_at: string;
  assessment_id: string;
  assessment_title: string;
  redeemed: number;
};
export type VoucherAnalytics = {
  credits: number;
  redeemed: number;
  remaining: number;
  completed: number;
  completion_rate: number;
  average_score: number;
};
export type VoucherCode = {
  code: string;
  status: 'ACTIVE' | 'REDEEMED' | 'REVOKED';
  redeemed_at: string | null;
};
// One person who redeemed a code in the batch, with their result (if taken).
export type VoucherRedeemer = {
  name: string | null;
  email: string;
  code: string;
  redeemed_at: string | null;
  completed: boolean;
  score: number | null;
  attempt_id: string | null;
};
export type VoucherBatchDetail = {
  batch_id: string;
  assessment_id: string;
  company_name: string;
  credits: number;
  created_at: string;
  analytics: VoucherAnalytics;
  redeemers: VoucherRedeemer[];
  codes: VoucherCode[];
};
export type CreateBatchResult = {
  batch_id: string;
  assessment_id: string;
  assessment_title: string;
  company_name: string;
  credits: number;
  created_at: string;
};
export type RedeemResult = {
  assessment_id: string;
  assessment_title: string;
  granted_tokens: number;
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
  imageUrl?: string | null;
  totalAttempts: number;
};

export type MentorChoice = {
  id: string;
  choice_text: string;
  score: number;
  categories: string[] | null;
};
export type MentorQuestion = {
  id: string;
  question_text: string;
  correct_answer: string | null;
  explanation: string | null;
  choices: MentorChoice[];
};

// AI question import preview (not yet saved).
export type AIChoice = { text: string; score: number; categories?: string[] };
export type AIQuestionPreview = {
  question: string;
  choices: AIChoice[];
  correct_answer: string;
  explanation: string;
};
export type ResultCategory = { name: string; knowledge: string };
export type ResultCategories = Record<string, ResultCategory>;

export type MentorAssessmentDetail = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  status: AssessmentStatus;
  result_categories: ResultCategories | null;
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
  study_video_url: string | null;
  learning_resources: LearningResourcesDoc | null;
  access_mode: AccessMode | null;
  access_token_cost: number;
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
