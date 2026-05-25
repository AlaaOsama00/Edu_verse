import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { IMarks } from '@interfaces/IMarks';
import { applySummerPenalty, calculateTotalScore, calculateWeightedGPA, mapScoreToGrade } from '@utils/helpers';
import { GradeEnum, SummerReason } from '@utils/enum';
import { IGradeHours } from '@interfaces/IGradeHours';
import { CourseAssessmentRepository } from '@models/index';
import { GradeCourseDto } from './dto/gradeDto';


@Injectable()
export class GradingService {
  
  constructor(
    private readonly courseAssessmentRepository: CourseAssessmentRepository,
  ) {}

  async gradeStudentCourse(gradeDto: GradeCourseDto) {
    
    const { studentId, courseId, semester, midterm, final, practical, project } = gradeDto;

    // 1. جيب السجل الفاضي اللي عملناه في الـ Registration (أو سجل الصيف)
    const assessment = await this.courseAssessmentRepository.findRecordByStudentAndCourse(
      new Types.ObjectId(studentId),
      new Types.ObjectId(courseId),
      semester
    );

    if (!assessment) {
      throw new NotFoundException('This student is not registered for this course in this semester.');
    }
    // Store marks & clC Tscore
    const marks: IMarks = { midterm, final, practical, project };
    const totalScore = calculateTotalScore(marks);

    // Convert to (A+, A, B-, etc..)
    const earnedGrade = mapScoreToGrade(totalScore);

    let finalGrade = earnedGrade;
    
    //Summer Reason
    if (assessment.summerReason === SummerReason.FAILURE) {
      finalGrade = applySummerPenalty(earnedGrade, assessment.summerReason);
    } 

    const isPassed = finalGrade !== GradeEnum.F;

    // 6. تحديث السجل في الداتا بيز (بنستخدم الـ document نفسه اللي جبناه وبنعمل save)
    assessment.marks = marks;
    assessment.totalScore = totalScore;
    assessment.earnedGrade = earnedGrade;
    assessment.finalGrade = finalGrade;
    assessment.isPassed = isPassed;
    
    //store in DB
     await this.courseAssessmentRepository.update({
      filter: {
        studentId: new Types.ObjectId(studentId),
        courseId: new Types.ObjectId(courseId),
        semester: semester,
      },
      update: {
        marks: marks,
        totalScore: totalScore,
        earnedGrade: earnedGrade,
        finalGrade: finalGrade,
        isPassed: isPassed,
      }
    });
    
    // 7. حساب الـ Cumulative GPA الجديد للطالب
    const allPassedRecords = await this.courseAssessmentRepository.findStudentCumulativeRecords(
      new Types.ObjectId(studentId)
    );

    // تجهيز الداتا لدالة الـ GPA اللي في الـ Utils
    const gpaData: IGradeHours[] = allPassedRecords.map(record => ({
      grade: record.finalGrade,
      creditHours: record.creditHours,
    }));

    const newGPA = calculateWeightedGPA(gpaData);

    return {
      message: 'Grades added successfully',
      totalScore,
      earnedGrade,
      finalGrade,
      isPassed,
      newCumulativeGPA: newGPA,
    };
  }
}