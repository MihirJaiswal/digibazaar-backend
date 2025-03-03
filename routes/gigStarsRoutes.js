// routes/gigStarsRoutes.js
import express from 'express';
import { addGigStar, removeGigStar, getGigStars, getGigStarCount } from '../controllers/gigStarsController.js';

const router = express.Router();

router.post('/add', addGigStar);
router.post('/remove', removeGigStar);
router.get('/:gigId', getGigStars);
router.get('/count/:gigId', getGigStarCount);

export default router;

