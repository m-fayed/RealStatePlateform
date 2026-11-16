import { Router } from 'express';
import { uploadImage, uploadDoc, MAX_LISTING_IMAGES, storeUploads, readDocument } from '../lib/uploads.js';
import { uploadLimiter } from '../lib/security.js';
import {
  uploadListingImages,
  uploadLicense,
  uploadReceipt,
  uploadErrorHandler,
} from '../controllers/uploads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/documents/:filename', requireAuth, readDocument);
router.use(uploadLimiter);

// Broker listing photos — requires an active broker account.
router.post(
  '/images',
  requireAuth,
  requireRole('broker'),
  uploadImage.array('images', MAX_LISTING_IMAGES),
  storeUploads('images'),
  uploadErrorHandler,
  uploadListingImages
);

// Broker license document — public (pre-registration upload).
router.post(
  '/license',
  uploadDoc.single('license'),
  storeUploads('license'),
  uploadErrorHandler,
  uploadLicense
);

// Vodafone Cash transfer receipt — broker only (uploaded during checkout).
router.post(
  '/receipt',
  requireAuth,
  requireRole('broker'),
  uploadDoc.single('receipt'),
  storeUploads('receipt'),
  uploadErrorHandler,
  uploadReceipt
);

export default router;
