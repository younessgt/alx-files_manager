const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    const uri = `mongodb://${host}:${port}`;
    this.client = new MongoClient(uri, { useUnifiedTopology: true });
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const userCollection = this.client.db(database).collection('users');
    // countDocuments() function is an asynchronous function. It returns a promise
    const count = await userCollection.countDocuments();
    return count;
  }

  async nbFiles() {
    const fileCollection = this.client.db(database).collection('files');
    const count = await fileCollection.countDocuments();
    return count;
  }

  async getUserByEmail(emailToComapre) {
    const userCollection = this.client.db(database).collection('users');
    try {
      const user = await userCollection.findOne({ email: emailToComapre });
      return user;
    } catch (err) {
      console.log('Error Found: ', err);
      throw err;
    }
  }

  async setUser(email, password) {
    const userCollection = this.client.db(database).collection('users');
    try {
      const returnedUser = await userCollection.insertOne({
        email,
        password,
      });

      return { id: returnedUser.insertedId, email };
    } catch (err) {
      console.log('Inserting failed');
      throw err;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
