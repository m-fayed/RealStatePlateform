import { Router } from 'express';
import { purchaseCredits } from '../controllers/credits.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/purchase', requireAuth, requireRole('broker'), purchaseCredits);

export default router;
