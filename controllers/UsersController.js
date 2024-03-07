import sha1 from 'sha1';
import dbClient from '../utils/db';

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
}

module.exports = UsersController;
