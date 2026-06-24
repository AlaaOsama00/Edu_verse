import { EnrollmentRepository, UserRepository, StudyPlanRepository, CourseRepository } from '@models/index';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BulkGradeDto } from './dtos/bulk-grade.dto';
import { AcademicRecordService } from '../academicRecord/academicRecord.service';
import { GradeEnum } from '@utils/enum';

function mapScoreToGradeLetter(score: number): GradeEnum {
  if (score >= 97) return GradeEnum.A_PLUS;
  if (score >= 93) return GradeEnum.A;
  if (score >= 90) return GradeEnum.A_MINUS;
  if (score >= 87) return GradeEnum.B_PLUS;
  if (score >= 83) return GradeEnum.B;
  if (score >= 80) return GradeEnum.B_MINUS;
  if (score >= 77) return GradeEnum.C_PLUS;
  if (score >= 73) return GradeEnum.C;
  if (score >= 70) return GradeEnum.C_MINUS;
  if (score >= 67) return GradeEnum.D_PLUS;
  if (score >= 63) return GradeEnum.D;
  if (score >= 60) return GradeEnum.D_MINUS;
  return GradeEnum.F;
}

@Injectable()
export class GradeService {
    constructor(
        private readonly enrollmentRepo: EnrollmentRepository,
        private readonly userRepo: UserRepository,
        private readonly studyPlanRepo: StudyPlanRepository,
        private readonly courseRepo: CourseRepository,
        private readonly academicRecordService: AcademicRecordService,
    ) { }

    /**
     * جيب كل مواد الطالب مع درجاتهم (الـ 5 مواد)
     * ممكن ترجعهم فلات أو مجمّعين حسب السنة والترم
     */
    async getStudentGrades(studentId: string) {
        const studentObj = new Types.ObjectId(studentId)
        const student = await this.userRepo.findById(studentObj)
        if (!student) {
            throw new NotFoundException()
        }



        const enrollments = await this.enrollmentRepo['model']
            .find({
                studentId: studentObj,
                currentYear: student.currentYear,
            })
            .populate('courseId', 'name code creditHours');

        if (enrollments.length === 0) {
            throw new NotFoundException('No Enrollments for you');
        }

        // === شكل 1: اراي فلات بسيطة (الـ 5 مواد) ===
        const flatList = enrollments.map(enrollment => {
            const course = enrollment.courseId as any;
            return {
                courseId: course._id,
                courseName: course.name,
                courseCode: course.code,
                creditHours: course.creditHours,
                academicYear: enrollment.academicYear,
                semester: enrollment.semester,
                totalMarks: enrollment.totalScore ?? 0,
                finalGrade: enrollment.finalGrade ?? 'N/A',
            };
        });

        // === شكل 2: مجمّع حسب السنة والترم (أحسن للفرونت) ===
        const grouped = this.groupByTerm(flatList);

        // حساب المعدل التراكمي (GPA)
        const gpa = this.calculateGPA(flatList);

        return {
            studentId,
            totalCourses: flatList.length,
            gpa,
            // ارجع الاتنين عشان الفرونت يختار اللي يحتاجه
            flatGrades: flatList,
            groupedByTerm: grouped,
        };
    }




    // ==========================================
    // 1. عرض الـ Gradebook للدكتور
    // ==========================================
    async getGradebook(professorId: string) {
        const professorObjId = new Types.ObjectId(professorId);

        // 1. جلب الخطط الدراسية التي تحتوي على كورسات يدرسها هذا الدكتور
        const studyPlans = await this.studyPlanRepo.find(
            { 'courses.professorId': professorObjId },
            {},
            {},
            { path: 'courses.courseId', select: 'name code creditHours' }
        );

        const result: any[] = [];

        for (const plan of studyPlans) {
            // تصفية المواد التي يدرسها هذا الدكتور فقط في هذه الخطة الدراسية
            const professorCourses = plan.courses.filter(
                (c) => c.professorId.toString() === professorId
            );

            for (const item of professorCourses) {
                const course = item.courseId as any;
                if (!course) continue;

                // جلب الطلاب المسجلين في هذه المادة بنفس السنة والترم الدراسي
                const enrollments = await this.enrollmentRepo.find(
                    {
                        courseId: course._id,
                        academicYear: plan.academicYear,
                        semester: plan.semester,
                    },
                    {},
                    {},
                    { path: 'studentId', select: 'fullName academicId' }
                );

                const studentsList = enrollments.map((enrollment: any) => {
                    const student = enrollment.studentId ;
                    return {
                        studentId: student?._id,
                        studentName: student?.fullName || 'N/A',
                        academicId: student?.academicId || 'N/A',
                        marks: {
                            assignment1: enrollment.marks?.assignment1 ?? 0,
                            assignment2: enrollment.marks?.assignment2 ?? 0,
                            midterm: enrollment.marks?.midterm ?? 0,
                            final: enrollment.marks?.final ?? 0,
                            practical: enrollment.marks?.practical ?? 0,
                        },
                    };
                });

                result.push({
                    courseId: course._id,
                    courseName: course.name,
                    courseCode: course.code,
                    academicYear: plan.academicYear,
                    semester: plan.semester,
                    students: studentsList,
                });
            }
        }

        return result;
    }




  /*
  هيجسي الماركس بتع كل ماده من  ال enrollment 
  */
  async getMyCurrentGrades(studentId: string, semester: string) {
    
    const studentObjId = new Types.ObjectId(studentId);
    const user = await this.userRepo.findById(studentObjId);
    if (!user)
      throw new NotFoundException();
    const enrollments = await this.enrollmentRepo.find(
      {
        studentId: studentObjId,
        semester: semester // اللي هي مبعوتة من البوست مان 'FALL'
      },
      {},
      {},
      { path: 'courseId', select: 'name' }
    );

    // 2. لو الطالب مش مسجل أي مواد في الترم ده
    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    // 3. ترتيب وتصفية الداتا عشان نرجع شكل نظيف للـ Frontend
    const gradesReport = enrollments.map(enrollment => {
      const course = enrollment.courseId as any;
      return {
        courseId: course ? course._id : enrollment.courseId,
        courseName: course ? course.name : null, 
        marks: enrollment.marks || {}, // بنرجع الـ Object بتاع الدرجات كامل
      };
    });

    return gradesReport;
  }



    // ==========================================
    // 3. رفع درجات الامتحان من الإكسل (براكتيكال/ميدترم/فاينال)
    // ==========================================
    async UploadGrades(courseId: string, dto: BulkGradeDto[]) {
      if (!dto || dto.length === 0) {
        throw new BadRequestException('No grade records provided');
      }

      const studentsToEvaluate = new Map<string, { studentId: Types.ObjectId, academicYear: string, semester: any }>();

      for (const item of dto) {
        const student = await this.userRepo.findOne({ filter: { academicId: item.studentAcademicId } });
        if (!student) {
          throw new BadRequestException(`Student with academic ID ${item.studentAcademicId} not found`);
        }

        const enrollment = await this.enrollmentRepo.findOne({
          filter: {
            studentId: student._id,
            courseId: new Types.ObjectId(courseId),
          }
        });

        if (!enrollment) {
          throw new BadRequestException(`Enrollment not found for student ${item.studentAcademicId} in course ${courseId}`);
        }

        const currentMarks = enrollment.marks || { midterm: 0, final: 0, practical: 0, assignment1: 0, assignment2: 0 };
        const updatedMarks = {
          midterm: item.midterm != undefined ? item.midterm : (currentMarks.midterm ?? 0),
          final: item.final != undefined ? item.final : (currentMarks.final ?? 0),
          practical: item.practical != undefined ? item.practical : (currentMarks.practical ?? 0),
          assignment1: currentMarks.assignment1 ?? 0,
          assignment2: currentMarks.assignment2 ?? 0,
        };

        // Recalculate scores
        let totalScore = 0;
        Object.values(updatedMarks).forEach((mark: number) => {
          if (typeof mark === 'number') {
            totalScore += mark;
          }
        });

        // Determine passing and penalty
        const isPassed = totalScore >= 60;
        const earnedGrade = mapScoreToGradeLetter(totalScore);
        let finalGrade = earnedGrade;
        let hasPenalty = !isPassed; // إذا سقطت المادة (hasPenalty = true)

        if (enrollment.attemptCount === 2) {
          const gradeScale = [
            GradeEnum.A_PLUS, GradeEnum.A, GradeEnum.A_MINUS,
            GradeEnum.B_PLUS, GradeEnum.B, GradeEnum.B_MINUS,
            GradeEnum.C_PLUS, GradeEnum.C, GradeEnum.C_MINUS,
            GradeEnum.D_PLUS, GradeEnum.D, GradeEnum.D_MINUS,
            GradeEnum.F
          ];
          const currentIndex = gradeScale.indexOf(earnedGrade);
          if (currentIndex !== -1 && earnedGrade !== GradeEnum.F) {
            const nextIndex = Math.min(currentIndex + 1, gradeScale.length - 1);
            finalGrade = gradeScale[nextIndex];
          } else {
            finalGrade = GradeEnum.F;
          }
          hasPenalty = true;
        }

        // Save enrollment
        await this.enrollmentRepo.findOneAndUpdate({
          filter: { _id: enrollment._id },
          update: {
            $set: {
              marks: updatedMarks,
              totalScore,
              earnedGrade,
              finalGrade,
              isPassed,
              hasPenalty, // يتم تخزينها وتحديثها هنا
            }
          }
        });

        // Save info for evaluation
        studentsToEvaluate.set(student._id.toString(), {
          studentId: student._id,
          academicYear: enrollment.academicYear,
          semester: enrollment.semester,
        });
      }

     

      return { message: 'Grades uploaded and processed successfully.' };
    }
  


    /**
     * تجميع المواد حسب السنة والترم
     */
    private groupByTerm(courses: any[]) {
        const map = new Map<string, any[]>();

        courses.forEach(course => {
            const key = `Year ${course.academicYear} - ${course.semester}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(course);
        });

        // تحويل الـ Map لـ Array
        return Array.from(map.entries()).map(([term, courses]) => ({
            term,
            courses,
            termGPA: this.calculateGPA(courses),
        }));
    }

    /**
     * حساب المعدل (GPA)-simple
     * A=4, B=3, C=2, D=1, F=0
     */
    private calculateGPA(courses: any[]): string {
        if (courses.length === 0) return '0.00';

        const gradePoints: Record<string, number> = {
            'A': 4, 'A+': 4, 'A-': 3.7,
            'B+': 3.3, 'B': 3, 'B-': 2.7,
            'C+': 2.3, 'C': 2, 'C-': 1.7,
            'D+': 1.3, 'D': 1,
            'F': 0,
        };

        let totalPoints = 0;
        let totalHours = 0;

        courses.forEach(course => {
            const hours = course.creditHours || 3;
            const points = gradePoints[course.finalGrade] ?? 0;
            totalPoints += points * hours;
            totalHours += hours;
        });

        return totalHours > 0 ? (totalPoints / totalHours).toFixed(2) : '0.00';
    }
}