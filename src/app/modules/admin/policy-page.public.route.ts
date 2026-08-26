import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import { PolicyPageController } from './policy-page.controller';
import { PolicyPageValidation } from './policy-page.validation';

const router = express.Router();

// Public — no auth. The app shows these before login (signup's "Terms &
// Privacy Policy" links) and to any logged-in role, so it isn't nested
// under /admin even though admins are the ones who edit the content.
router.get('/', PolicyPageController.getPolicyPages);
router.get(
  '/:type',
  validateRequest(PolicyPageValidation.getPolicyPageZodSchema),
  PolicyPageController.getPolicyPage
);

export const PolicyPagePublicRouter = router;
