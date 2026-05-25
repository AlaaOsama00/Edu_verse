export enum StatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}


export enum StudentStatusEnum {
  ENROLLED = 'ENROLLED',
  DROPPED = 'DROPPED',
}
export enum AcademicYearEnum {
  YEAR_1 = 'YEAR_1',
  YEAR_2 = 'YEAR_2',
  YEAR_3 = 'YEAR_3',
  YEAR_4 = 'YEAR_4',
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

export enum GenderEnum {
  MALE = 'Male',
  FEMALE = 'Female' 
}

export enum SummerReason {
  NONE = 'NONE',                 // لو أخدها في فصل عادي
  FAILURE = 'FAILURE',           // لو رسبهاوجاي ياخدها في الصيف (هيتطبق عليه الخصم)
  NON_REGISTRATION = 'NON_REGISTRATION', // لو ما سجلش فيها أصلاً (مفيش خصم)
}

export enum SemesterEnum {
  First  = 'FIRST',
  Second = 'SECOND',
  Summer = 'SUMMER',
}
 
export enum TrackEnum {
  UI = 'UI',
  CYBERSECURITY = 'CYBERSECURITY',
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  MOBILE = 'MOBILE',
  AI = 'AI',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  NETWORK = 'NETWORK',
}

export enum GroupRoleEnum {
  GroupAdmin = 'GROUP_ADMIN',
  Member     = 'MEMBER',
}
  
//https://www.pngall.com/wp-content/uploads/5/Profile-PNG-High-Quality-Image.png  Prfile Picture URL
