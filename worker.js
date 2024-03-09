import Bull from 'bull';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const imageThumbnail = require('image-thumbnail');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw Error('Missing fileId');
  }
  if (!userId) {
    throw Error('Missing userId');
  }

  const file = await dbClient
    .fileCollection()
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    throw Error('File not found');
  }

  const { localPath: filePath } = file;
  const widths = [500, 250, 100];

  try {
    widths.forEach(async (width) => {
      const thumbnail = await imageThumbnail(filePath, { width });
      fs.writeFileSync(`${filePath}_${width}`, thumbnail);
    });
  } catch (err) {
    console.log('An error occurred:', err);
  }
});
