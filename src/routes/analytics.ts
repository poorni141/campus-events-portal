import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { getAuthenticatedUser } from './auth';

const router = Router();

// GET /api/organizer/analytics/overview
router.get('/overview', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const targetOrgId = user.organizationId || 'org-aura';

  const analytics = db.getOrganizerAnalytics(targetOrgId);
  res.json({ analytics });
});

// GET /api/organizer/analytics/revenue
router.get('/revenue', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const targetOrgId = user.organizationId || 'org-aura';

  const analytics = db.getOrganizerAnalytics(targetOrgId);
  res.json({
    salesTrend: analytics.salesTrend,
    totalRevenue: analytics.totalRevenue,
  });
});

// GET /api/organizer/analytics/categories
router.get('/categories', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const targetOrgId = user.organizationId || 'org-aura';

  const analytics = db.getOrganizerAnalytics(targetOrgId);
  res.json({
    revenueByCategory: analytics.revenueByCategory,
    categoryPerformance: analytics.categoryPerformance,
  });
});

export default router;
