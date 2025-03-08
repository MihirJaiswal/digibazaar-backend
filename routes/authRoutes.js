import express from 'express';
import { register, login, logout, uploadUserImage } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', uploadUserImage,  register);
router.post('/login', login);
router.post('/logout', logout);

export default router;
