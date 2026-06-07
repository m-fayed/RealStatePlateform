import { Router } from 'express';
import {
  listListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  boostListing,
} from '../controllers/listings.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', listListings);
router.get('/:id', getListing);
router.post('/', requireAuth, requireRole('broker'), createListing);
router.put('/:id', requireAuth, requireRole('broker'), updateListing);
router.delete('/:id', requireAuth, requireRole('broker'), deleteListing);
router.post('/:id/boost', requireAuth, requireRole('broker'), boostListing);

export default router;
