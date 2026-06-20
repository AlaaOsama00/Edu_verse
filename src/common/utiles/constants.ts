import { AssessmentTypeEnum } from "./enum";

export const ASSESSMENT_MAX_MARKS: Record<AssessmentTypeEnum, number> = {
  [AssessmentTypeEnum.ASSIGNMENT1]: 10,
  [AssessmentTypeEnum.ASSIGNMENT2]: 10,
  [AssessmentTypeEnum.MIDTERM]: 20,
  [AssessmentTypeEnum.PRACTICAL]: 20,
  [AssessmentTypeEnum.FINAL]: 40,
};