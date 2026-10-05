import { Router } from 'express';
import {
  getPackages,
  purchaseCredits,
  listMyTransactions,
} from '../controllers/credits.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Pricing + payment config — needs auth (brokers only reach the buy page).
router.get('/packages', requireAuth, requireRole('broker'), getPackages);
router.post('/purchase', requireAuth, requireRole('broker'), purchaseCredits);
router.get('/transactions', requireAuth, requireRole('broker'), listMyTransactions);

export default router;
