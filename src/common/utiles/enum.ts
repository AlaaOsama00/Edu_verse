export enum ActivationEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
// ====== حالة التسليم (جديد) ======
export enum SubmissionStatusEnum {
  NOT_SUBMITTED = 'not_submitted', // الحالة الافتراضية: الطالب لسه ضغط على زرار التسليم ولا رفع ملف
  SUBMITTED = 'submitted',         // الطالب رفع الملف/الواجب قبل ما موعد التسليم يقفل
  MISSING = 'missing',             // الموعد قفل، والطالب مفروش حاجة (غالباً بيتحطت أوتوماتيك لما الدكتور يضغط "Close Deadline")
}
export enum GradeStatusEnum {
  PENDING = 'pending',       // الحالة الافتراضية: الدكتور لسه فاتح الـ Gradebook ولا صحح الملف ده
  GRADED = 'graded',         // الدكتور فتح الملف، قرأه، وكتب الدرجة (سواء 10 من 10 أو 0 من 10)
}

export enum EnrollmentStatusEnum {
  ACTIVE = 'active',
  COMPLETED = 'closed',
}

export enum AssessmentTypeEnum {
  ASSIGNMENT1 = 'assignment1',//20
  ASSIGNMENT2 = 'assignment2',
  MIDTERM = 'midterm',
  FINAL = 'final',
  PRACTICAL = 'practical',
}

export enum AcademicYearEnum {
  YEAR_1 = '1',
  YEAR_2 = '2',
  YEAR_3 = '3',
  YEAR_4 = '4',
}

export enum UserRolesEnum {
  ADMIN = 'Admin',
  STUDENT = 'Student',
  PROFESSOR = 'Professor',
}

export enum GradeEnum {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  D_PLUS = 'D+',
  D = 'D',
  D_MINUS = 'D-',
  F = 'F',
}

export enum SummerReasonEnum {
  NONE = 'NONE',                 // لو أخدها في فصل عادي
  FAILURE = 'FAILURE',           // لو رسبهاوجاي ياخدها في الصيف (هيتطبق عليه الخصم)
}

export enum SemesterEnum {
  FALL = 'FALL',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
}


export enum StudentStatusEnum {
  ENROLLED = 'ENROLLED',
  DROPPED = 'DROPPED',
}//to do in 4 th year term  2



export enum ClubTagEnum {
  UI = '#UI',
  CYBERSECURITY = '#CYBERSECURITY',
  BACKEND = '#BACKEND',
  FRONTEND = '#FRONTEND',
  MOBILE = '#MOBILE',
  AI = '#AI',
  DATA_ANALYSIS = '#DATA_ANALYSIS',
  NETWORK = '#NETWORK',
  Database = '#DATABASE',
}

export enum ClubResourceTypeEnum {
  PDF = 'PDF',
  VIDEO_STREAM = 'VideoStream',
  LINK = 'Link',
}

export enum ClubMemberRoleEnum {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
}