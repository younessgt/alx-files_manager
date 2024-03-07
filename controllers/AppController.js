import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, resp) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      resp.status(200).send({ redis: true, db: true });
    }
  }

  static async getStats(req, resp) {
    /*
    // method 1 using Promise.all
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()]).then(
      ([countUser, countFile]) => {
        resp.status(200).send({ users: countUser, files: countFile });
      }
    );  */

    // second method using async await we change getStat to async func
    resp.status(200).send({
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    });
  }
}

module.exports = AppController;
