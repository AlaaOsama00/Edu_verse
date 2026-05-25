import { GradeEnum } from "@utils/enum";


export interface IGradeMapping {
  min: number;
  max: number;
  grade: GradeEnum;
  points: number; // الـ Points اللي بتحسب بيه الـ GPA (من 4.0)
}