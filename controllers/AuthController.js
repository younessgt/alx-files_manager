import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, resp) {
    // console.log(req.headers);
    const { authorization } = req.headers;
    if (!authorization) {
      resp.status(401).json({ error: 'No authorization in header' });
      return;
    }
    const decode64Key = authorization.slice(6);
    // console.log(decode64Key);

    const credentials = Buffer.from(decode64Key, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');
    // console.log(`${email}  ${password}`);
    const hashpass = sha1(password);
    const user = await dbClient.getUserByEmail(email);
    if (!user || user.password !== hashpass) {
      resp.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const uuidToken = uuidv4();
    const keyToken = `auth_${uuidToken}`;

    await redisClient.set(keyToken, user._id.toString(), 86400);
    resp.status(200).json({ token: uuidToken });
  }

  static async getDisconnect(req, resp) {
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

    await redisClient.del(`auth_${xToken}`);
    resp.status(200).json();
  }
}

module.exports = AuthController;
