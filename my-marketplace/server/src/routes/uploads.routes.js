import { Router } from 'express';
import { uploadImage, uploadDoc, MAX_LISTING_IMAGES } from '../lib/uploads.js';
import {
  uploadListingImages,
  uploadLicense,
  uploadErrorHandler,
} from '../controllers/uploads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Broker listing photos — requires an active broker account.
router.post(
  '/images',
  requireAuth,
  requireRole('broker'),
  uploadImage.array('images', MAX_LISTING_IMAGES),
  uploadErrorHandler,
  uploadListingImages
);

// Broker license document — public (pre-registration upload).
router.post(
  '/license',
  uploadDoc.single('license'),
  uploadErrorHandler,
  uploadLicense
);

export default router;
