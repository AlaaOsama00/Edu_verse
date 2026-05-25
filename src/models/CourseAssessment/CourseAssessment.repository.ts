import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { CourseAssessment} from '@models/CourseAssessment/CourseAssessment.schema';
import { SemesterEnum } from '@utils/enum';

@Injectable()
export class CourseAssessmentRepository extends AbstractRepository<CourseAssessment> {
  constructor(
    @InjectModel(CourseAssessment.name)protected readonly courseAssessment: Model<CourseAssessment>,
  ) {
    super(courseAssessment);
  }

  /**
   * Creates a new academic record in the database.
   * !Note: The Service must calculate totalScore, earnedGrade, and finalGrade (with penalty) BEFORE calling this.
   */
  async create(recordData: Partial<CourseAssessment>): Promise<CourseAssessment> {
    const newRecord = new this.courseAssessment(recordData);
    return newRecord.save();
  }

    /**
   * Retrieves ALL PASSED records for a student across all years.
   * THIS IS THE ONLY FUNCTION USED FOR CALCULATING CUMULATIVE GPA.
   */
  async findStudentCumulativeRecords(studentId: Types.ObjectId|string): Promise<CourseAssessment[]> {
    return this.courseAssessment.find({ studentId, isPassed: true }).exec();
  }

  /**
   * Retrieves records for a specific student in a specific academic year.
   * NOT USED FOR GPA.
   * Used strictly by the Service to apply the Business Rule: 
   * "If a student fails twice in the same year, they repeat the year."
   */
  async findRecordsByAcademicYear(
    studentId: Types.ObjectId,
    year: number,
  ): Promise<CourseAssessment[]> {
    return this.courseAssessment.find({ 
      studentId, 
      academicYear: year,
      isPassed: false // بنجيب الراسبات بس عشان نشوف هل هم 2 ولا لا
    }).exec();
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
    const registeredRecords = await this.courseAssessment.find({
      studentId,
      academicYear: year,
      semester: { $in: [SemesterEnum.First, SemesterEnum.Second] },
      courseId: { $in: requiredCourseIds }
    }).select('courseId').exec();

    const registeredIds = registeredRecords.map(r => r.courseId.toString());

    return requiredCourseIds.filter(
      courseId => !registeredIds.includes(courseId.toString())
    );
  }

  /**
   * Finds a specific course record for a student in a specific semester.
   * Used to check if a student failed a main semester course to assign it to Summer Term.
   */
  async findRecordByStudentAndCourse(
    studentId: Types.ObjectId,
    courseId: Types.ObjectId,
    semester: string,
  ): Promise<CourseAssessment | null> {
    return this.courseAssessment.findOne({ studentId, courseId, semester }).exec();
  }


}