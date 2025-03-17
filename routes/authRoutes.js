import express from 'express';
import { 
  initiateRegister, 
  verifyOtpAndRegister, 
  resendOtp, 
  login, 
  logout,
  uploadUserImage 
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register/initiate', uploadUserImage, initiateRegister);
router.post('/register/verify', verifyOtpAndRegister);
router.post('/register/resend-otp', resendOtp);
router.post('/login', login);
router.post('/logout', logout);

export default router;
