import { Router } from 'express';
import {
  createOrFetchConversation,
  getConversation,
  listMessages,
  listMyConversations,
  postMessage,
} from '../controllers/conversations.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Every chat route requires an authenticated user.
router.use(requireAuth);

router.get('/', listMyConversations);
router.post('/', createOrFetchConversation);
router.get('/:id', getConversation);
router.get('/:id/messages', listMessages);
router.post('/:id/messages', postMessage);

export default router;
