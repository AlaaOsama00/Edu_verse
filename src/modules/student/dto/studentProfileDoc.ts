// import { StatusEnum } from "@utils/enum";

// export class StudentResponseDto {
//   // بيانات الـ Student
//   academicId: string;
//   currentYear: number;
//   currentEnrolledCourses: string[];
  
//   // بيانات الـ User
//   fullName: string;
//   email: string;
//   status: string;

//   static fromDocument(doc: any): StudentResponseDto {
//     // أخذ بيانات اليوزر لو موجودة (عشان لو الـ Populate فشل مش يقع الـ App)
//     const user = doc.userId || {};

//     return {
//       // Student Data
//       academicId: doc.academicId,
//       currentYear: doc.currentYear,
//       currentEnrolledCourses: doc.currentEnrolledCourses?.map(id => id.toString()) || [],
      
//       // User Data
//       fullName: user.fullName || 'Unknown',
//       email: user.email || 'Unknown',
//       status: user.status || StatusEnum.INACTIVE
//     };
//   }
// }

// /*
// userId ={ }

// لكن ا populate بترجع 
// userId = {
//   fullName: 'Ahmed Ali',
//   email: '  
// }
//  */