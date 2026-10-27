import { Router, Request, Response } from 'express';
import { db } from '../services/db';

const router = Router();

// Current active session simulation header or fallback to Sarah Jenkins
export function getAuthenticatedUser(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || 'usr-attendee-1';
  return db.users.get(userId) || db.users.get('usr-attendee-1')!;
}

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { name, email, role, organizationName } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const existing = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  let orgId: string | undefined;
  if (role === 'ORGANIZER') {
    orgId = `org-${Date.now()}`;
    db.organizations.set(orgId, {
      id: orgId,
      name: organizationName || `${name}'s Organization`,
      slug: (organizationName || name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: 'Independent event organization on TicketNest.',
      contactEmail: email,
      isVerified: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role: role || 'ATTENDEE',
    organizationId: orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.set(newUser.id, newUser);
  db.logAudit(newUser.id, newUser.email, 'REGISTER', 'USER', newUser.id, `User registered as ${newUser.role}`);

  res.status(201).json({
    user: newUser,
    token: `tn-sim-token-${newUser.id}`,
    message: 'Registration successful.',
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials or account not found.' });
  }

  res.json({
    user,
    token: `tn-sim-token-${user.id}`,
    message: 'Login successful.',
  });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const organization = user.organizationId ? db.organizations.get(user.organizationId) : null;
  res.json({ user, organization });
});

// GET /api/auth/demo-users
router.get('/demo-users', (_req: Request, res: Response) => {
  const users = Array.from(db.users.values()).map((u) => {
    const org = u.organizationId ? db.organizations.get(u.organizationId) : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      organizationName: org?.name,
    };
  });
  res.json(users);
});

export default router;
