import express from 'express';
import { deleteUser, getUser, updateUser, uploadUserImage } from '../controllers/userController.js';
import { verifyToken } from '../middleware/jwt.js';

const router = express.Router();

router.delete('/:id', verifyToken, deleteUser);
router.get('/:id', getUser);
router.put('/:id', verifyToken, uploadUserImage, updateUser);

export default router;
