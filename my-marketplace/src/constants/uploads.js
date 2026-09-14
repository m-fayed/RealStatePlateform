// Shared upload constraints — must stay in sync with the server's rules
// (server/src/lib/uploads.js).
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPTED_LICENSE_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 10;
