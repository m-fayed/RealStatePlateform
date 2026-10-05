import { Router } from 'express';
import {
  listPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getStatistics,
  listTransactions,
  approveTransaction,
  rejectTransaction,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Every admin route requires auth + admin role.
router.use(requireAuth, requireRole('admin'));

router.get('/registrations', listPendingRegistrations);
router.post('/registrations/:id/approve', approveRegistration);
router.post('/registrations/:id/reject', rejectRegistration);
router.get('/statistics', getStatistics);

// Credit-purchase requests.
router.get('/transactions', listTransactions);
router.patch('/transactions/:id/approve', approveTransaction);
router.patch('/transactions/:id/reject', rejectTransaction);

export default router;
