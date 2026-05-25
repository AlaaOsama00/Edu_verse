const { MongoClient } = require('mongodb');

async function dropIndex() {
  const uri = "mongodb://alaanabih90_db_user:FoBWssr2U0Fz7ZgQ@ac-jgsbzyv-shard-00-00.ugracvs.mongodb.net:27017,ac-jgsbzyv-shard-00-01.ugracvs.mongodb.net:27017,ac-jgsbzyv-shard-00-02.ugracvs.mongodb.net:27017/Eduverse?ssl=true&authSource=admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db("Eduverse");
    const usersCollection = db.collection("users");
    
    // Check if the index exists
    const indexes = await usersCollection.indexes();
    console.log("Current indexes:", indexes.map(i => i.name));

    if (indexes.find(i => i.name === 'recoveryEmail_1')) {
      await usersCollection.dropIndex("recoveryEmail_1");
      console.log("Dropped recoveryEmail_1 index");
    } else {
      console.log("Index recoveryEmail_1 not found");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

dropIndex();
