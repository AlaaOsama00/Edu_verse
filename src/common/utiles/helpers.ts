import * as bcrypt from 'bcrypt';
import { customAlphabet } from "nanoid";
import { IMarks, IGradeMapping ,IGradeHours} from '@interfaces/index';
import { GradeEnum, SummerReason } from '@utils/enum';

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

// 1. تعريف الـ Scale بتاع الجامعة (ممكن تعدل الأرقام حسب نظام الجامعة بتاعتكم)
const GRADE_SCALE: IGradeMapping[] = [
  { min: 97, max: 100, grade: GradeEnum.A_PLUS, points: 4.0 },
  { min: 93, max: 96.99, grade: GradeEnum.A, points: 4.0 },
  { min: 90, max: 92.99, grade: GradeEnum.A_MINUS, points: 3.7 },
  { min: 87, max: 89.99, grade: GradeEnum.B_PLUS, points: 3.3 },
  { min: 83, max: 86.99, grade: GradeEnum.B, points: 3.0 },
  { min: 80, max: 82.99, grade: GradeEnum.B_MINUS, points: 2.7 },
  { min: 77, max: 79.99, grade: GradeEnum.C_PLUS, points: 2.3 },
  { min: 73, max: 76.99, grade: GradeEnum.C, points: 2.0 },
  { min: 70, max: 72.99, grade: GradeEnum.C_MINUS, points: 1.7 },
  { min: 67, max: 69.99, grade: GradeEnum.D_PLUS, points: 1.3 },
  { min: 63, max: 66.99, grade: GradeEnum.D, points: 1.0 },
  { min: 60, max: 62.99, grade: GradeEnum.D_MINUS, points: 0.7 },
  { min: 0, max: 59.99, grade: GradeEnum.F, points: 0.0 },
];

/**
 * دالة جمع الدرجات
 */
export function calculateTotalScore(marks: IMarks): number {
  const { midterm, final, practical, project } = marks;
  if (midterm < 0 || midterm > 20) {
    throw new Error(`Invalid midterm score: ${midterm}. It must be between 0 and 20.`);
  }
  
  if (final < 0 || final > 30) {
    throw new Error(`Invalid final score: ${final}. It must be between 0 and 30.`);
  }
  
  if (practical < 0 || practical > 20) {
    throw new Error(`Invalid practical score: ${practical}. It must be between 0 and 20.`);
  }
  
  if (project < 0 || project > 30) {
    throw new Error(`Invalid project score: ${project}. It must be between 0 and 30.`);
  }
  return midterm + final + practical + project;
}

/**
 * دالة تحويل الرقم لحرف
 */
export function mapScoreToGrade(score: number): GradeEnum {
  const found = GRADE_SCALE.find(
    (g) => score >= g.min && score <= g.max,
  );
  return found ? found.grade : GradeEnum.F;
}


export function applySummerPenalty(earnedGrade: GradeEnum, reason: SummerReason,): GradeEnum {

  const GRADES_ARRAY = Object.values(GradeEnum);
  if (reason === SummerReason.FAILURE) {
    const currentIdx = GRADES_ARRAY.indexOf(earnedGrade);
    
    const nextIdx = Math.min(currentIdx + 3, GRADES_ARRAY.length - 1);
    
    return GRADES_ARRAY[nextIdx];
  }

  // لو NON_REGISTRATION أو NONE، 
  return earnedGrade;
}

export function calculateWeightedGPA(gradesWithHours: IGradeHours[]): number {
  if (gradesWithHours.length === 0) return 0;

  let totalPoints = 0;
  let totalHours = 0;

  for (const item of gradesWithHours) {
    const mapping = GRADE_SCALE.find((g) => g.grade === item.grade);
    if (mapping) {
      totalPoints += mapping.points * item.creditHours; 
      totalHours += item.creditHours;
    }
  }

  return totalHours > 0 ? totalPoints / totalHours : 0;
}