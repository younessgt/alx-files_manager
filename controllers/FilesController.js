/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import Bull from 'bull';
import { ObjectId } from 'mongodb';
import { promisify } from 'util';
import mime from 'mime-types';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, resp) {
    const fileQueue = new Bull('fileQueue');
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
    if (fileType === 'image') {
      fileQueue.add({
        userId: user._id,
        fileId: file.insertedId,
      });
    }
    resp.status(201).json({
      name: fileName,
      type: fileType,
      parentId: fileParentId,
      isPublic: fileIsPublic,
      userId: user._id,
      id: file.insertedId,
    });
  }

  static async getShow(req, resp) {
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

    const { id: newId } = req.params;

    const file = await dbClient.getFileById(newId);

    if (!file || file.userId.toString() !== user._id.toString()) {
      resp.status(404).json({ error: 'Not found' });
      return;
    }
    const { _id: id, ...rest } = file;
    resp.status(200).json({
      id,
      ...rest,
    });
  }

  static async getIndex(req, resp) {
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
    const { parentId = 0, page = 0 } = req.query;

    let aggregateData;
    if (parentId !== 0) {
      aggregateData = [
        { $match: { parentId } },
        { $skip: page * 20 },
        { $limit: 20 },
      ];
    } else {
      aggregateData = [{ $skip: page * 20 }, { $limit: 20 }];
    }

    const files = dbClient.fileCollection().aggregate(aggregateData);
 
    const filesList = [];
    await files.forEach((file) => {
      const item = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      filesList.push(item);
    });
    return resp.send(filesList);
  }

  static async putPublish(req, resp) {
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

    const { id: newId } = req.params;

    const file = await dbClient.getFileById(newId);

    if (!file || file.userId.toString() !== user._id.toString()) {
      resp.status(404).json({ error: 'Not found' });
      return;
    }

    const query = { _id: ObjectId(newId) };
    const update = { $set: { isPublic: true } };

    try {
      await dbClient.fileCollection().updateOne(query, update);
      const updatedFile = await dbClient.getFileById(newId);
      const { _id: id, ...rest } = updatedFile;
      resp.status(200).json({
        id,
        ...rest,
      });
    } catch (err) {
      console.log('Error found: ', err);
    }
  }

  static async putUnpublish(req, resp) {
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

    const { id: newId } = req.params;

    const file = await dbClient.getFileById(newId);

    if (!file || file.userId.toString() !== user._id.toString()) {
      resp.status(404).json({ error: 'Not found' });
      return;
    }

    const query = { _id: ObjectId(newId) };
    const update = { $set: { isPublic: false } };

    try {
      await dbClient.fileCollection().updateOne(query, update);
      const updatedFile = await dbClient.getFileById(newId);
      const { _id: id, ...rest } = updatedFile;
      resp.status(200).json({
        id,
        ...rest,
      });
    } catch (err) {
      console.log('Error found: ', err);
    }
  }

  static async getFile(req, resp) {
    const { 'x-token': xToken } = req.headers;
    // if (!xToken) {
    //   resp.status(401).json({ error: 'Unauthorized' });
    //   return;
    // }
    const userId = await redisClient.get(`auth_${xToken}`);

    // if (!userId) {
    //   resp.status(401).json({ error: 'Unauthorized' });
    //   return;
    // }

    const user = await dbClient.getUserById(userId);

    const { id: newId } = req.params;
    const size = req.query.size || 0;
    // end

    const file = await dbClient.getFileById(newId);

    if (!file) {
      resp.status(404).json({ error: 'Not found' });
      return;
    }

    if (
      file.isPublic === false
      && (!xToken || !userId || file.userId.toString() !== user._id.toString())
    ) {
      resp.status(404).json({ error: 'Not found' });
      return;
    }

    if (file.type === 'folder') {
      resp.status(400).json({ error: "A folder doesn't have content" });
      return;
    }
    const newFilePath = size === 0 ? file.localPath : `${file.localPath}_${size}`;
    try {
      const fileData = fs.readFileSync(newFilePath);
      const mimeType = mime.lookup(file.name);
      resp.setHeader('Content-Type', mimeType);
      resp.send(fileData);
    } catch (err) {
      resp.status(404).json({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
