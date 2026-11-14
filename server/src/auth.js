import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from './env.js';
import { asyncHandler, HttpError } from './errors.js';

export const SESSION_COOKIE = 'eindex.sid';
const PASSWORD_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = await bcrypt.hash('not-a-real-password', PASSWORD_ROUNDS);

const loginSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
  role: z.enum(['admin', 'teacher']),
  rememberMe: z.boolean().optional().default(false)
});

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  department: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128)
});

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions(production, maxAge) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/api',
    ...(maxAge ? { maxAge } : {})
  };
}

function clearSessionCookie(res, production) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(production));
}

export function serializeUser(user) {
  return {
    id: user.id,
    userId: user.staffId || user.id,
    fullName: user.fullName,
    name: user.fullName,
    email: user.email,
    role: user.role.toLowerCase(),
    status: user.status,
    department: user.department,
    teacherId: user.staffId || null
  };
}

export function createSessionMiddleware(prisma, { production = env.NODE_ENV === 'production' } = {}) {
  return asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      req.user = null;
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date() || session.user.status !== 'APPROVED') {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      clearSessionCookie(res, production);
      req.user = null;
      return next();
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  });
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Your account does not have access to this resource.'));
    }
    next();
  };
}

export function createAuthRouter(prisma, {
  production = env.NODE_ENV === 'production',
  sessionTtlDays = env.SESSION_TTL_DAYS,
  rememberTtlDays = env.REMEMBER_SESSION_TTL_DAYS
} = {}) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } }
  });

  router.post('/register', loginLimiter, asyncHandler(async (req, res) => {
    const input = registrationSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existing) throw new HttpError(409, 'EMAIL_IN_USE', 'An account or registration with this email already exists.');

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.name,
          department: input.department,
          role: 'TEACHER',
          status: 'PENDING',
          notificationPreferences: { updates: true, attendance: true, announcements: true }
        }
      });
      const registration = await tx.teacherRegistration.create({ data: { userId: user.id } });
      const admins = await tx.user.findMany({ where: { role: 'ADMIN', status: 'APPROVED' }, select: { id: true } });
      if (admins.length) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'Teacher registration pending',
            detail: `${user.fullName} requested teacher access.`
          }))
        });
      }
      await tx.auditLog.create({
        data: {
          type: 'REGISTER',
          action: user.fullName,
          detail: 'Submitted teacher registration',
          target: user.email
        }
      });
      return registration;
    });

    res.status(201).json({
      message: 'Registration submitted. An administrator must approve your account.',
      registration: { id: result.id, status: result.status }
    });
  }));

  router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
    }

    if (user.role.toLowerCase() !== input.role) {
      throw new HttpError(403, 'ROLE_MISMATCH', 'This account cannot access the selected portal.');
    }
    if (user.status !== 'APPROVED') {
      throw new HttpError(403, user.status === 'PENDING' ? 'ACCOUNT_PENDING' : 'ACCOUNT_INACTIVE',
        user.status === 'PENDING' ? 'This account is awaiting administrator approval.' : 'This account is inactive.');
    }

    const token = randomBytes(32).toString('base64url');
    const rememberDays = input.rememberMe ? rememberTtlDays : sessionTtlDays;
    const expiresAt = new Date(Date.now() + rememberDays * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async tx => {
      await tx.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt } });
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await tx.auditLog.create({
        data: {
          type: 'LOGIN',
          action: user.fullName,
          detail: `${user.role === 'ADMIN' ? 'Administrator' : 'Teacher'} logged in`,
          target: user.email,
          actorId: user.id
        }
      });
    });

    const maxAge = input.rememberMe ? rememberDays * 24 * 60 * 60 * 1000 : undefined;
    res.cookie(SESSION_COOKIE, token, cookieOptions(production, maxAge));
    res.json({ user: serializeUser(user), rememberMe: input.rememberMe });
  }));

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: serializeUser(req.user) });
  });

  router.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    clearSessionCookie(res, production);
    res.status(204).end();
  }));

  return router;
}
