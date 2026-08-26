import express from 'express';
import { UserRouter } from '../app/modules/user/user.route';
import { AuthRouter } from '../app/modules/auth/auth.route';
import { AdminRoutes } from '../app/modules/admin/admin.route';
import { PolicyPagePublicRouter } from '../app/modules/admin/policy-page.public.route';
import { WalletRouter } from '../app/modules/wallet/wallet.route';
import { DestinationRouter } from '../app/modules/destination/destination.route';
import { OperatorRouter } from '../app/modules/operator/operator.route';
import { NotificationRouter } from '../app/modules/notification/notification.route';
import { CallRouter } from '../app/modules/call/call.route';
import { PayoutRouter } from '../app/modules/payout/payout.route';
import { DisputeRouter } from '../app/modules/dispute/dispute.route';
import { AnalyticsRouter } from '../app/modules/analytics/analytics.route';

const router = express.Router();
const routes = [
  {
    path: '/auth',
    route: AuthRouter,
  },
  {
    path: '/users',
    route: UserRouter,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/policy',
    route: PolicyPagePublicRouter,
  },
  {
    path: '/wallet',
    route: WalletRouter,
  },
  {
    path: '/destinations',
    route: DestinationRouter,
  },
  {
    path: '/operator',
    route: OperatorRouter,
  },
  {
    path: '/notifications',
    route: NotificationRouter,
  },
  {
    path: '/calls',
    route: CallRouter,
  },
  {
    path: '/payout',
    route: PayoutRouter,
  },
  {
    path: '/disputes',
    route: DisputeRouter,
  },
  {
    path: '/admin',
    route: AnalyticsRouter,
  },
];

routes.forEach((element) => {
  if (element?.path && element?.route) {
    router.use(element?.path, element?.route);
  }
});

export default router;
