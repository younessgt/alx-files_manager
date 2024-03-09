import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

router.get('/status', (req, resp) => {
  AppController.getStatus(req, resp);
});

router.get('/stats', (req, resp) => {
  AppController.getStats(req, resp);
});

router.post('/users', (req, resp) => {
  UsersController.postNew(req, resp);
});

router.get('/connect', (req, resp) => {
  AuthController.getConnect(req, resp);
});

router.get('/disconnect', (req, resp) => {
  AuthController.getDisconnect(req, resp);
});

router.get('/users/me', (req, resp) => {
  UsersController.getMe(req, resp);
});

// leila part

router.post('/files', (req, resp) => {
  FilesController.postUpload(req, resp);
});

router.get('/files', (req, resp) => {
  FilesController.getIndex(req, resp);
});

router.get('/files/:id', (req, resp) => {
  FilesController.getShow(req, resp);
});

router.put('/files/:id/publish', (req, resp) => {
  FilesController.putPublish(req, resp);
});

router.put('/files/:id/unpublish', (req, resp) => {
  FilesController.putUnpublish(req, resp);
});

module.exports = router;
