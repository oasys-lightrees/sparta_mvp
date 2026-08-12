// English translations (source of truth for keys). Only system/UI strings —
// expert-authored content (titles, questions, category names) is never here.
export const en = {
  // Language switcher
  'lang.label': 'Language',
  'lang.english': 'English',
  'lang.indonesian': 'Bahasa Indonesia',

  // Navbar / auth
  'nav.login': 'Login',
  'nav.register': 'Register',
  'nav.logout': 'Logout',

  // Landing page
  'landing.badge': 'The Modern Assessment Academy',
  'landing.heroTitlePrefix': 'Know yourself. Train your potential.',
  'landing.heroTitleHighlight': 'Become stronger.',
  'landing.heroSubtitle':
    'Every learner needs feedback; every transformation starts with measurement. LATO turns an honest assessment into a Growth Blueprint, and a plan to act on it.',
  'landing.ctaCreate': 'Begin your training',
  'landing.ctaDemo': 'See how it works',
  // Hero blueprint preview
  'landing.blueprintTitle': 'Growth Blueprint',
  'landing.metricStrength': 'Strength',
  'landing.metricDiscipline': 'Discipline',
  'landing.metricPotential': 'Potential',
  'landing.problemTitle': 'Most people guess at where they stand.',
  'landing.problemBody':
    'Without honest feedback and a clear plan, growth stalls. Generic courses never tell you your real strengths, or the gaps holding you back.',
  'landing.solutionTitle': 'LATO measures it, then gives you a plan.',
  'landing.solutionBody':
    'Accept a training challenge, get an objective read on where you stand, and receive a Growth Blueprint that turns your results into concrete next steps.',
  'landing.featuresTitle': 'Everything you need to train and grow',
  'landing.howTitle': 'Train. Measure. Improve.',
  'landing.pricingTitle': 'Free to take, top up for paid challenges',
  'landing.finalCtaTitle': 'Find out how strong you are today',
  'landing.finalCtaSubtitle':
    'Accept your first challenge, claim your Growth Blueprint, and start training with purpose.',
  'landing.getStarted': 'Begin your training',

  // Assessment cards (a challenge you accept)
  'assessment.free': 'Free',
  'assessment.start': 'View assessment',
  'assessment.challengeTag': 'Challenge',
  'assessment.availableTitle': 'Training Challenges',

  // User dashboard (command center)
  'dashboard.commandCenter': 'Command Center',
  'dashboard.welcome': 'Welcome back',
  'dashboard.overview':
    'Your growth journey continues. Pick your next challenge.',
  'dashboard.balance': 'Wallet Balance',
  'dashboard.topUp': 'Top Up Balance',
  'dashboard.toppingUp': 'Topping up…',
  'dashboard.assessmentsTaken': 'Completed Challenges',
  'dashboard.reportsAvailable': 'Reports',
  'dashboard.myAssessments': 'Your Growth Journey',
  'dashboard.exploreAssessments': 'Training Challenges',
  'dashboard.colAssessment': 'Challenge',
  'dashboard.colScore': 'Strength Index',
  'dashboard.colDate': 'Date',
  'dashboard.colReport': 'Blueprint',
  'dashboard.viewReport': 'View Blueprint',
  'dashboard.unlocked': '✓ Unlocked',
  // User dashboard — results empty state + team vouchers
  'dashboard.emptyResultsTitle': 'Complete an assessment to receive insights',
  'dashboard.emptyResultsDesc':
    'Take an assessment below and your personalized results and reports will show up here.',
  'dashboard.teamVouchers': 'Team vouchers',
  'dashboard.teamVouchersDesc':
    "Buy a package of voucher codes for your team, hand them out, and review each person's result here.",
  'dashboard.buyVoucherFor': 'Buy voucher codes for',
  'dashboard.selectAssessment': 'Select an assessment…',
  'dashboard.buyVoucherCodes': 'Buy voucher codes',
  'dashboard.vCompany': 'Company',
  'dashboard.vAssessment': 'Assessment',
  'dashboard.vRedeemed': 'Redeemed',
  'dashboard.vPurchased': 'Purchased',
  'dashboard.vManage': 'Manage',
  'dashboard.viewResults': 'View results',
  'dashboard.noAssessments': 'No assessments available yet',

  // Report page (your growth blueprint)
  'report.preparing': 'Preparing your blueprint…',
  'report.blueprintEyebrow': 'Your Growth Blueprint',
  'report.rank': 'Rank',
  'report.summary': 'Summary',
  'report.totalScore': 'Strength Index',
  'report.yourResult': 'Your result',
  'report.reportType': 'BLUEPRINT',
  'report.studyVideoTitle': 'Opening video',
  'report.studyVideoDescription':
    'An opening video from your expert for this assessment.',
  'report.resourcesTitle': 'Learning Resources',
  'report.resourcesPathTitle': 'Your Personalized Learning Path',
  'report.resourcesDescription':
    'Curated materials matched to your result to help you act on it.',
  'report.goDashboard': 'Go to command center',
  'report.backHome': 'Back to home',

  // Levels / ranks (system-computed)
  'level.Beginner': 'Beginner',
  'level.Intermediate': 'Intermediate',
  'level.Advanced': 'Advanced',
  'level.Completed': 'Completed',

  // Take assessment
  'take.submit': 'Submit',
  'take.submitting': 'Submitting…',

  // Expert / admin headings
  'mentor.dashboard': 'Expert Dashboard',
  'admin.dashboard': 'Admin Dashboard',

  // Expert dashboard home
  'mentor.subtitle': 'Create and manage your assessments, questions and results.',
  'mentor.createAssessment': 'Create assessment',
  'mentor.newAssessment': 'New assessment',
  'mentor.create': 'Create',
  'mentor.statTotal': 'Total Assessments',
  'mentor.statPublished': 'Published Assessments',
  'mentor.statTaken': 'Total People Taken Tests',
  'mentor.statAvgScore': 'Average Score',
  'mentor.emptyTitle': 'Create your first assessment',
  'mentor.emptyDesc':
    'Build an assessment, add your questions, and start collecting responses and revenue.',
  // Expert assessment table
  'mentor.colTitle': 'Title',
  'mentor.colStatus': 'Status',
  'mentor.colAttempts': 'Attempts',
  'mentor.colActions': 'Actions',
  'mentor.manage': 'Manage',
  'mentor.publish': 'Publish',
  'mentor.unpublish': 'Unpublish',
  'mentor.delete': 'Delete',
  // Expert analytics
  'analytics.title': 'Analytics',
  'analytics.boughtTitle': 'Assessments bought',
  'analytics.boughtDesc': 'Purchases per day',
  'analytics.emptyBought': 'No purchases yet',
  'analytics.revenueTitle': 'Revenue over time',
  'analytics.revenueDesc': 'Balance (Rp) earned per day',
  'analytics.emptyRevenue': 'No paid revenue yet',
  // Expert revenue
  'revenue.title': 'Revenue',
  'revenue.total': 'Total Revenue',
  'revenue.bought': 'Assessments Bought',
  'revenue.emptyTitle': 'Purchases will appear here',
  'revenue.emptyDesc':
    'When someone buys access to your assessment, it shows up in this list.',
  'revenue.colAssessment': 'Assessment',
  'revenue.colTier': 'Product tier',
  'revenue.colAmount': 'Amount',
  'revenue.colDate': 'Date',
  'revenue.colBuyer': 'Bought by',

  // Manage assessment page
  'manage.back': 'Back to dashboard',
  'manage.details': 'Details',
  'manage.questions': 'Questions',
  'manage.pricing': 'Product & pricing',
  'manage.landing': 'Landing page',
  'manage.share': 'Share',
  'manage.results': 'Results',
  'manage.detailsTitle': 'Assessment details',
  'manage.edit': 'Edit',
  'manage.saveChanges': 'Save changes',
  'manage.description': 'Description',
  'manage.lowThreshold': 'Low threshold',
  'manage.highThreshold': 'High threshold',
  'manage.freeReportText': 'Free report text',
  'manage.openingVideo': 'Opening video',

  // Results table
  'results.empty': 'No attempts yet.',
  'results.participant': 'Participant',
  'results.score': 'Score',
  'results.submitted': 'Submitted',
  'results.guest': 'Guest',

  // Share assessment
  'share.title': 'Share Assessment',
  'share.descPublished':
    'This links to your assessment’s landing page. Anyone can open it and take the assessment, no sign-up required.',
  'share.descDraft':
    'Publish this assessment to make its landing page live at this link.',
  'share.copyError':
    'Could not copy automatically. Select and copy the link above.',
  'share.copied': 'Copied',
  'share.copyLink': 'Copy Link',

  // Question editor
  'q.count': 'Questions',
  'q.add': 'Add question',
  'q.none': 'No questions yet.',
  'q.text': 'Question text',
  'q.choices': 'Choices',
  'q.choice': 'Choice',
  'q.addChoice': 'Add choice',
  'q.remove': 'Remove',
  'q.mapsTo': 'Maps to:',
  'q.edit': 'Edit',
  'q.delete': 'Delete',
  'q.save': 'Save question',
  'q.saving': 'Saving…',
  'q.cancel': 'Cancel',
  'q.errText': 'Question text is required',
  'q.errChoice': 'At least one choice is required',
  'q.errChoiceText': 'Every choice needs text',
  'q.errScore': 'Every choice needs an integer score',
  'q.scoreBadge': 'score',

  // Assessment form
  'af.type': 'Assessment Type',
  'af.skillTitle': 'Skill Assessment',
  'af.skillDesc': 'Evaluate knowledge with correct answers and scoring.',
  'af.personalityTitle': 'Personality Assessment',
  'af.personalityDesc': 'Categorize users based on answer patterns.',
  'af.title': 'Title',
  'af.description': 'Description',
  'af.coverPhoto': 'Cover photo',
  'af.coverHelp':
    "Optional cover shown on the assessment card. Use a 16:9 (widescreen) image, recommended 1280×720 (min 640×360). It's cropped to fill, so keep the subject centered. PNG, JPG, JPEG or WEBP · up to 5 MB.",
  'af.low': 'Low threshold',
  'af.high': 'High threshold',
  'af.freeIntro': 'Free result introduction',
  'af.freeText': 'Free report text',
  'af.freeIntroPh': 'Intro shown above the user’s result type',
  'af.freeTextPh': 'Intro shown above the score band (legacy fallback)',
  'af.freeTemplate': 'Free score report template',
  'af.videoUrl': 'Opening video URL',
  'af.videoHelp':
    'Optional opening video for this assessment. Supports YouTube, Vimeo, or a direct video link.',
  'af.categoriesTitle': 'Personality Result Categories',
  'af.categoriesDesc':
    "Define result types with a short code (e.g. PB, PO), a name and knowledge. Results are based on each answer's category mapping (set per choice in the question editor) instead of a score.",
  'af.codePh': 'Code (e.g. PB)',
  'af.namePh': 'Name (e.g. Power Builder)',
  'af.knowledgePh': 'Knowledge: what people with this result are like',
  'af.remove': 'Remove',
  'af.addCategory': '+ Add Category',
  'af.saving': 'Saving…',
  'af.cancel': 'Cancel',
  'af.errTitle': 'Title is required',
  'af.errThreshold': 'Low score threshold must be <= high score threshold',
};
