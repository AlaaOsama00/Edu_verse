import * as bcrypt from 'bcrypt';
import { customAlphabet } from "nanoid";
import { IMarks, IGradeMapping ,IGradeHours} from '@interfaces/index';
import { GradeEnum, SummerReasonEnum } from '@utils/enum';

export const generateOTP = (length: number = 6): string => {
 const otp =customAlphabet('0123456789', length)()
  return otp;
}


export async function hashPassword(password: string) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const compare = async ( data: string, hashed: string,): Promise<boolean> => {
  return await bcrypt.compare(data, hashed)
}




const GRADE_HIERARCHY: GradeEnum[] = [
  GradeEnum.A_PLUS, GradeEnum.A, GradeEnum.A_MINUS,
  GradeEnum.B_PLUS, GradeEnum.B, GradeEnum.B_MINUS,
  GradeEnum.C_PLUS, GradeEnum.C, GradeEnum.C_MINUS,
  GradeEnum.D_PLUS, GradeEnum.D, GradeEnum.D_MINUS,
  GradeEnum.F
];

/**
 * وظيفة: تطبيق عقوبة إنقاص التقدير بسبب الرسوب
 * @param originalGrade التقدير الأصلي اللي جابه الطالب
 * @param penaltyLevels عدد مرات الخصم (1 لو سقط مرة، 2 لو سقط مرتين)
 * @returns التقدير الجديد بعد الإنقاص
 */
export function applyGradePenalty(originalGrade: GradeEnum, penaltyLevels: number): GradeEnum {
  if (penaltyLevels <= 0) return originalGrade;
  
  const currentIndex = GRADE_HIERARCHY.indexOf(originalGrade);
  if (currentIndex === -1) return GradeEnum.F; // لو لقيه مش معروف، حطه F
  
  // ننزل في المصفوفة بناءً على عدد مرات الخصم، ونضمن ما نطلع برا المصفوفة
  const newIndex = Math.min(currentIndex + penaltyLevels, GRADE_HIERARCHY.length - 1);
  
  return GRADE_HIERARCHY[newIndex];
}

/**
 * وظيفة: تحويل التقدير الحرفي لنقاط رقمية (عشان حساب الـ GPA)
 * @param grade التقدير (مثلاً 'B-' أو 'A+')
 * @returns النقاط (من 4.0)
 */
export function gradeToPoints(grade: string): number {
  // بنستخدم الـ Enum كـ Keys عشان الـ TypeScript يكون سعيد ومفيشش أخطاء إملائية
  const map: Record<string, number> = {
    [GradeEnum.A_PLUS]: 4.0,
    [GradeEnum.A]: 4.0,       // A و A+ لهم نفس النقاط زي ما اتفقنا
    [GradeEnum.A_MINUS]: 4.0,
    [GradeEnum.B_PLUS]: 3.3,
    [GradeEnum.B]: 3.0,
    [GradeEnum.B_MINUS]: 2.7,
    [GradeEnum.C_PLUS]: 2.3,
    [GradeEnum.C]: 2.0,
    [GradeEnum.C_MINUS]: 1.7,
    [GradeEnum.D_PLUS]: 1.3,
    [GradeEnum.D]: 1.0,
    [GradeEnum.D_MINUS]: 1.0, // رجعنا الـ D-
    [GradeEnum.F]: 0.0,
  };
  
  return map[grade] ?? 0; // لو حصل خطأ وطلع حرف مش معروف، رجع 0
}

export function calculateTimeLeft(deadline: Date): string {
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''}`;
  }




// // 1. تعريف الـ Scale بتاع الجامعة (ممكن تعدل الأرقام حسب نظام الجامعة بتاعتكم)
// export const GRADE_SCALE: IGradeMapping[] = [
//   { min: 97, max: 100, grade: GradeEnum.A_PLUS, points: 4.0 },
//   { min: 93, max: 96.99, grade: GradeEnum.A, points: 4.0 },
//   { min: 90, max: 92.99, grade: GradeEnum.A_MINUS, points: 3.7 },
//   { min: 87, max: 89.99, grade: GradeEnum.B_PLUS, points: 3.3 },
//   { min: 83, max: 86.99, grade: GradeEnum.B, points: 3.0 },
//   { min: 80, max: 82.99, grade: GradeEnum.B_MINUS, points: 2.7 },
//   { min: 77, max: 79.99, grade: GradeEnum.C_PLUS, points: 2.3 },
//   { min: 73, max: 76.99, grade: GradeEnum.C, points: 2.0 },
//   { min: 70, max: 72.99, grade: GradeEnum.C_MINUS, points: 1.7 },
//   { min: 67, max: 69.99, grade: GradeEnum.D_PLUS, points: 1.3 },
//   { min: 63, max: 66.99, grade: GradeEnum.D, points: 1.0 },
//   { min: 60, max: 62.99, grade: GradeEnum.D_MINUS, points: 0.7 },
//   { min: 0, max: 59.99, grade: GradeEnum.F, points: 0.0 },
// ];

// /**
//  * دالة جمع الدرجات
//  */
// export function calculateTotalScore(marks: IMarks): number {
//   const { midterm, final, practical, assignment1, assignment2 } = marks;
//   if (midterm < 0 || midterm > 20) {
//     throw new Error(`Invalid midterm score: ${midterm}. It must be between 0 and 20.`);
//   }
  
//   if (final < 0 || final > 40) {
//     throw new Error(`Invalid final score: ${final}. It must be between 0 and 40.`);
//   }
  
//   if (practical < 0 || practical > 20) {
//     throw new Error(`Invalid practical score: ${practical}. It must be between 0 and 20.`);
//   }
  
//   if (assignment1 < 0 || assignment1 > 10 || assignment2 < 0 || assignment2 > 10) {
//     throw new Error(`Invalid assignment score. It must be between 0 and 10.`);
//   }

  
//   return midterm + final + practical + assignment1 + assignment2;
// }

// /**
//  * دالة تحويل الرقم لحرف
//  */
// export function mapScoreToGrade(score: number): GradeEnum {
//   const found = GRADE_SCALE.find(
//     (g) => score >= g.min && score <= g.max,
//   );
//   return found ? found.grade : GradeEnum.F;
// }


// export function applySummerPenalty(earnedGrade: GradeEnum, reason: SummerReasonEnum,): GradeEnum {

//   const GRADES_ARRAY = Object.values(GradeEnum);
//   if (reason === SummerReasonEnum.FAILURE) {
//     const currentIdx = GRADES_ARRAY.indexOf(earnedGrade);
    
//     const nextIdx = Math.min(currentIdx + 3, GRADES_ARRAY.length - 1);
    
//     return GRADES_ARRAY[nextIdx];
//   }

//   // لو NON_REGISTRATION أو NONE، 
//   return earnedGrade;
// }

// export function calculateWeightedGPA(gradesWithHours: IGradeHours[]): number {
//   if (gradesWithHours.length === 0) return 0;

//   let totalPoints = 0;
//   let totalHours = 0;

//   for (const item of gradesWithHours) {
//     const mapping = GRADE_SCALE.find((g) => g.grade === item.grade);
//     if (mapping) {
//       totalPoints += mapping.points * item.creditHours; 
//       totalHours += item.creditHours;
//     }
//   }

//   return totalHours > 0 ? totalPoints / totalHours : 0;
// }


