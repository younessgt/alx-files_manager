import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

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
  AppController.getStatus(req, resp);
});

router.get('/disconnect', (req, resp) => {
  AppController.getStatus(req, resp);
});

router.get('/users/me', (req, resp) => {
  AppController.getStatus(req, resp);
});

module.exports = router;
