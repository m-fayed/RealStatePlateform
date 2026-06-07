import { Router } from 'express';
import { getBrokerProfile } from '../controllers/brokers.controller.js';

const router = Router();

router.get('/:id', getBrokerProfile);

export default router;
