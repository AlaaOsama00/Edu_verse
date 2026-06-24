const { MongoClient } = require('mongodb');

async function checkEnrollments() {
  const uri = "mongodb://alaanabih90_db_user:FoBWssr2U0Fz7ZgQ@ac-jgsbzyv-shard-00-00.ugracvs.mongodb.net:27017,ac-jgsbzyv-shard-00-01.ugracvs.mongodb.net:27017,ac-jgsbzyv-shard-00-02.ugracvs.mongodb.net:27017/Eduverse?ssl=true&authSource=admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("Eduverse");

    console.log("=== ENROLLMENT STATUS COUNT ===");
    const agg = await db.collection("enrollments").aggregate([
      { $group: { _id: "$enrollmentStatus", count: { $sum: 1 } } }
    ]).toArray();
    console.log(agg);

    console.log("=== ENROLLMENT IS_PASSED COUNT ===");
    const aggPassed = await db.collection("enrollments").aggregate([
      { $group: { _id: "$isPassed", count: { $sum: 1 } } }
    ]).toArray();
    console.log(aggPassed);

    console.log("=== ALL STUDENTS ===");
    const students = await db.collection("users").find({ role: "Student" }).toArray();
    console.log(students.map(s => ({ id: s._id, name: s.fullName, role: s.role })));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkEnrollments();
