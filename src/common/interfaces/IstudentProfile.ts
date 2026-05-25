import { Student } from 'src/models/student/student.schema';
import { User } from "src/models/user/user.schema";
//
export interface PopulatedStudentProfile extends Omit<Student, 'userId'> {
  userId: User; // هنا بنقول للتايب سكربت: لو حصل populate، اليوزر ده هيبقى كامل مش مجرد ID
}
