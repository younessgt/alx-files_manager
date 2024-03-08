import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { promisify } from 'util';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, resp) {
    const { 'x-token': xToken } = req.headers;
    if (!xToken) {
      resp.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = await redisClient.get(`auth_${xToken}`);
    if (!userId) {
      resp.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await dbClient.getUserById(userId);
    const fileName = req.body.name;
    if (!fileName) {
      resp.status(400).json({ error: 'Missing name' });
      return;
    }
    const fileIsPublic = req.body.isPublic || false;
    const acceptedType = ['file', 'folder', 'image'];

    const fileType = req.body.type;
    if (!fileType || !acceptedType.includes(fileType)) {
      resp.status(400).json({ error: 'Missing type' });
      return;
    }
    const fileData = req.body.data;
    if (!fileData && fileType !== 'folder') {
      resp.status(400).json({ error: 'Missing data' });
      return;
    }

    const fileParentId = req.body.parentId || 0;
    // fileParentId is a number because using Express.js with body-parser
    //  it will automatically parse the JSON request body and convert it
    // to a JavaScript object
    // so in this case the value of fileParentId will be number
    if (fileParentId !== 0) {
      const parentFile = await dbClient.getFileById(fileParentId);
      if (!parentFile) {
        resp.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (parentFile.type !== 'folder') {
        resp.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    const allFileData = {
      name: fileName,
      type: fileType,
      parentId: fileParentId,
      isPublic: fileIsPublic,
      userId: user._id,
    };

    if (fileType === 'folder') {
      const file = await dbClient.setFile(allFileData);
      resp.status(201).json({
        name: fileName,
        type: fileType,
        parentId: fileParentId,
        isPublic: fileIsPublic,
        userId: user._id,
        id: file.insertedId,
      });
      return;
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    const filenameUuid = uuidv4();
    const localPath = `${folderPath}/${filenameUuid}`;

    const binaryData = Buffer.from(fileData, 'base64');

    console.log(binaryData);

    const mkdirPromise = promisify(fs.mkdir);
    const writeFilePromise = promisify(fs.writeFile);

    await mkdirPromise(folderPath, { recursive: true });

    await writeFilePromise(localPath, binaryData, (err) => {
      if (err) {
        console.log('error writing to file');
      }
    });

    const fileDataWithPath = {
      name: fileName,
      type: fileType,
      parentId: fileParentId,
      isPublic: fileIsPublic,
      userId: user._id,
      localPath,
    };

    const file = await dbClient.setFile(fileDataWithPath);
    resp.status(201).json({
      name: fileName,
      type: fileType,
      parentId: fileParentId,
      isPublic: fileIsPublic,
      userId: user._id,
      id: file.insertedId,
    });
  }
}

module.exports = FilesController;
