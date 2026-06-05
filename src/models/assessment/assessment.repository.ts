import { Injectable } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { AbstractRepository } from "@models/abstract.repository";
import { SemesterEnum } from "@utils/enum";
import { Assessment } from "./assessment.schema";




@Injectable()
export class  AssessmentRepository extends AbstractRepository<Assessment> {
    constructor(
      @InjectModel(Assessment.name)protected readonly assessment: Model<Assessment>,
    ) {
      super(assessment);
    } 

 /**
   * Creates a new academic record in the database.
   * !Note: The Service must calculate totalScore, earnedGrade, and finalGrade (with penalty) BEFORE calling this.
   */
  async create(recordData: Partial<Assessment>): Promise<Assessment> {
    const newRecord = new this.assessment(recordData);
    return newRecord.save();
  }

    /**
   * Retrieves ALL PASSED records for a student across all years.
   * THIS IS THE ONLY FUNCTION USED FOR CALCULATING CUMULATIVE GPA.
   */
  async findStudentCumulativeRecords(studentId: Types.ObjectId|string): Promise<Assessment[]> {
    return this.assessment.find({ studentId, isPassed: true }).exec();
  }



  /**
   * CRITICAL BUSINESS RULE QUERY:
   * Returns courses the student DID NOT register for during the main semesters.
   * Used to enforce the Summer Term "NON_REGISTRATION" rule.
   */
  async findNonRegisteredCourses(
    studentId: Types.ObjectId,
    year: number,
    requiredCourseIds: Types.ObjectId[], 
  ): Promise<Types.ObjectId[]> {
    const registeredRecords = await this.assessment.find({
      studentId,
      academicYear: year,
      semester: { $in: [SemesterEnum.FALL, SemesterEnum.SPRING] },
      courseId: { $in: requiredCourseIds }
    }).select('courseId').exec();

    const registeredIds = registeredRecords.map(r => r.courseId.toString());

    return requiredCourseIds.filter(
      courseId => !registeredIds.includes(courseId.toString())
    );
  }


    
}