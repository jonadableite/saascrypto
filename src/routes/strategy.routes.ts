// src/routes/strategy.routes.ts

import { Router } from 'express';
import {
  getStrategyById,
  listStrategies,
} from '../controllers/strategy.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listStrategies);
router.get('/:id', getStrategyById);

export default router;
