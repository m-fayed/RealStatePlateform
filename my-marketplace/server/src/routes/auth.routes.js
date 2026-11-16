import { Router } from 'express';
import { registerSeeker, registerBroker, login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { loginLimiter } from '../lib/security.js';

const router = Router();

router.post('/register/seeker', registerSeeker);
router.post('/register/broker', registerBroker);
router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);

export default router;
