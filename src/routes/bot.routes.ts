// src/routes/bot.routes.ts
import { Router } from 'express';
import {
  createBot,
  deleteBot,
  getAllBots,
  getBot,
  getSignals,
  runBacktest,
  startBot,
  stopBot,
  updateBot,
} from '../controllers/bot.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createBot);
router.get('/', getAllBots);
router.get('/:id', getBot);
router.put('/:id', updateBot);
router.delete('/:id', deleteBot);
router.post('/:id/start', startBot);
router.post('/:id/stop', stopBot);
router.get('/:id/signals', getSignals);
router.post('/backtest', runBacktest);

export default router;
