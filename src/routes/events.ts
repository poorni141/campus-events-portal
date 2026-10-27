import { Router, Request, Response } from 'express';
import { db } from '../services/db';
import { cache } from '../services/cache';

const router = Router();

// GET /api/events - Public event discovery with search, category & date filters (Cached)
router.get('/', (req: Request, res: Response) => {
  const { category, search, city, date } = req.query;

  const cacheKey = `public:events:list:${category || 'all'}:${city || 'all'}:${search || ''}:${date || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ events: cached, source: 'cache' });
  }

  let events = Array.from(db.events.values()).filter((e) => e.status === 'PUBLISHED');

  if (category && category !== 'All') {
    events = events.filter((e) => e.category.toLowerCase() === String(category).toLowerCase());
  }

  if (city && city !== 'All') {
    events = events.filter((e) => e.city.toLowerCase() === String(city).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q)
    );
  }

  if (date) {
    events = events.filter((e) => e.eventDate.startsWith(String(date)));
  }

  // Attach price range & availability metadata
  const results = events.map((ev) => {
    const tiers = Array.from(db.ticketCategories.values()).filter(
      (t) => t.eventId === ev.id && t.isActive
    );
    const prices = tiers.map((t) => t.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const totalRemaining = tiers.reduce((acc, t) => acc + t.availableQuantity, 0);

    return {
      ...ev,
      minPrice,
      maxPrice,
      totalRemaining,
      ticketCount: tiers.length,
    };
  });

  // Cache for 60 seconds
  cache.set(cacheKey, results, 60);

  res.json({ events: results, source: 'database' });
});

// GET /api/events/categories
router.get('/categories', (_req: Request, res: Response) => {
  const cacheKey = 'public:events:categories';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const categories = ['All', 'Music', 'Tech', 'Culinary', 'Arts', 'Sports', 'Business'];
  cache.set(cacheKey, categories, 3600);
  res.json(categories);
});

// GET /api/events/:id - Event details + authoritative real-time ticket categories
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const event = db.events.get(id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Authoritative ticket categories (Never read stale inventory from cache!)
  const ticketCategories = Array.from(db.ticketCategories.values())
    .filter((t) => t.eventId === id && t.isActive)
    .sort((a, b) => b.price - a.price);

  const org = db.organizations.get(event.organizationId);

  res.json({
    event: {
      ...event,
      organization: org,
      ticketCategories,
    },
  });
});

export default router;
