import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middleware/auth';
import { AnalyticsController } from './analytics.controller';

const router = express.Router();

const adminOnly = auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN);

router.get('/dashboard', adminOnly, AnalyticsController.getDashboard);
router.get('/analytics', adminOnly, AnalyticsController.getAnalytics);

export const AnalyticsRouter = router;
