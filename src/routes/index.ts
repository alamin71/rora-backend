import express from 'express';
import { UserRouter } from '../app/modules/user/user.route';
import { AuthRouter } from '../app/modules/auth/auth.route';
import { AdminRoutes } from '../app/modules/admin/admin.route';
import { WalletRouter } from '../app/modules/wallet/wallet.route';
import { DestinationRouter } from '../app/modules/destination/destination.route';

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
    path: '/wallet',
    route: WalletRouter,
  },
  {
    path: '/destinations',
    route: DestinationRouter,
  },
];

routes.forEach((element) => {
  if (element?.path && element?.route) {
    router.use(element?.path, element?.route);
  }
});

export default router;
