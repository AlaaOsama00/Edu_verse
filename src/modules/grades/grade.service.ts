import { EnrollmentRepository, UserRepository, StudyPlanRepository, CourseRepository } from '@models/index';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class GradeService {
    constructor(
        private readonly enrollmentRepo: EnrollmentRepository,
        private readonly userRepo: UserRepository,
        private readonly studyPlanRepo: StudyPlanRepository,
        private readonly courseRepo: CourseRepository,
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
    const enrollments = await this.enrollmentRepo.find({
      studentId: studentObjId,
      semester: semester // اللي هي مبعوتة من البوست مان 'FALL'
    });

    // 2. لو الطالب مش مسجل أي مواد في الترم ده
    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    // 3. ترتيب وتصفية الداتا عشان نرجع شكل نظيف للـ Frontend
    const gradesReport = enrollments.map(enrollment => {
      return {
        courseId: enrollment.courseId,
        // لو الداتابيز عندك بتعمل Populate (Join) تقدر ترجع اسم الكورس كمان هنا
        // courseName: enrollment.courseId.name, 
        marks: enrollment.marks || {}, // بنرجع الـ Object بتاع الدرجات كامل
      };
    });

    return gradesReport;
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