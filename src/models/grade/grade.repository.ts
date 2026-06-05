import { Injectable } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { Grade } from "./grade.schema";
import { InjectModel } from "@nestjs/mongoose";
import { AbstractRepository } from "@models/abstract.repository";



@Injectable()
export class  GradeRepository extends AbstractRepository<Grade> {
    constructor(
      @InjectModel(Grade.name)protected readonly grade: Model<Grade>,
    ) {
      super(grade);
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
     ): Promise<Grade[]> {
       return this.grade.find({ 
         studentId, 
         academicYear: year,
         isPassed: false // بنجيب الراسبات بس عشان نشوف هل هم 2 ولا لا
       }).exec();
     }
    
       /**
   * Finds a specific course record for a student in a specific semester.
   * Used to check if a student failed a main semester course to assign it to Summer Term.
   */
  async findRecordByStudentAndCourse(
    studentId: Types.ObjectId,
    courseId: Types.ObjectId,
    semester: string,
  ): Promise<Grade | null> {
    return this.grade.findOne({ studentId, courseId, semester }).exec();
  }

}