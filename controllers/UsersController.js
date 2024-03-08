import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, resp) {
    const { email } = req.body;
    const { password } = req.body;

    if (!email) {
      resp.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      resp.status(400).json({ error: 'Missing password' });
      return;
    }

    const user = await dbClient.getUserByEmail(email);
    if (user) {
      resp.status(400).json({ error: 'Already exist' });
      return;
    }

    const hashedPassword = sha1(password);
    const response = await dbClient.setUser(email, hashedPassword);
    resp.status(201).json(response);
  }

  static async getMe(req, resp) {
    const { 'x-token': xToken } = req.headers;
    if (!xToken) {
      resp.status(401).json({ error: 'No token in header' });
      return;
    }
    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      resp.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await dbClient.getUserById(userId);
    if (!user) {
      resp.status(401).send({ error: 'Unauthorized' });
      return;
    }
    resp.status(200).json({ id: userId, email: user.email });
  }
}

module.exports = UsersController;
