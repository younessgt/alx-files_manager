const { MongoClient, ObjectId } = require('mongodb');

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
      console.log('Error User Found: ', err);
      throw err;
    }
  }

  async getUserById(id) {
    const userCollection = this.client.db(database).collection('users');
    try {
      const user = await userCollection.findOne({ _id: ObjectId(id) });
      return user;
    } catch (err) {
      console.log('Error User Found: ', err);
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

  async getFileById(id) {
    const fileCollection = this.client.db(database).collection('files');
    try {
      const file = await fileCollection.findOne({ _id: ObjectId(id) });
      return file;
    } catch (err) {
      console.log('Error File Found: ', err);
      throw err;
    }
  }

  async setFile(newfile) {
    const fileCollection = this.client.db(database).collection('files');
    try {
      const file = await fileCollection.insertOne(newfile);
      return file;
    } catch (err) {
      console.log('Error File Found: ', err);
      throw err;
    }
  }

  fileCollection() {
    return this.client.db(database).collection('files');
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
