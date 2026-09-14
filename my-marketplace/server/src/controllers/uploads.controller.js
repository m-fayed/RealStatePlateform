// Upload endpoints. Two flavors:
//
// POST /api/uploads/images   — broker-only, up to 10 listing photos at once
// POST /api/uploads/license  — public, single image-or-PDF broker license
//
// The license endpoint is public on purpose: brokers upload their license
// *before* an account exists (registration is what carries the URL). The
// multer limits in lib/uploads.js are the guardrails (1 file, 5 MB, strict
// type whitelist).

import { fileUrl } from '../lib/uploads.js';

// Multer errors (LIMIT_FILE_SIZE, bad type from our filter) arrive as an
// err passed to the global error handler. Normalize them into clean 400s
// with the same { success:false } shape the rest of the API uses.
export function uploadErrorHandler(err, _req, res, _next) {
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message?.startsWith('File type not allowed'))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Too many files' });
  }
  return _next(err);
}

// POST /api/uploads/images — expects field name "images" (multipart).
export function uploadListingImages(req, res, next) {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    return res.status(201).json({
      success: true,
      urls: req.files.map((f) => fileUrl(req, f.filename)),
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/uploads/license — expects field name "license" (multipart).
export function uploadLicense(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    return res.status(201).json({
      success: true,
      url: fileUrl(req, req.file.filename),
    });
  } catch (err) {
    return next(err);
  }
}
