import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from './env.js';
import { EmailDeliveryError, sendPasswordResetEmail } from './brevo.js';
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

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase())
});

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(128),
  password: z.string().min(8).max(128)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128)
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
    teacherId: user.staffId || null,
    photo: user.photo,
    notificationPreferences: user.notificationPreferences,
    appearance: user.appearance
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
  const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many password reset requests. Try again later.' } }
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

  router.post('/forgot-password', resetLimiter, asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    await prisma.passwordResetToken.findFirst({ select: { id: true } });
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, status: true }
    });

    if (user?.status === 'APPROVED') {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.$transaction(async tx => {
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await tx.passwordResetToken.create({
          data: { tokenHash, userId: user.id, expiresAt }
        });
      });

      const requestOrigin = req.get('origin');
      const sameOrigin = requestOrigin === `${req.protocol}://${req.get('host')}`;
      const baseOrigin = requestOrigin && (env.allowedOrigins.includes(requestOrigin) || sameOrigin)
        ? requestOrigin
        : env.FRONTEND_URL || env.allowedOrigins[0];
      const resetUrl = new URL('/reset-password', `${baseOrigin}/`);
      resetUrl.searchParams.set('token', token);

      try {
        await sendPasswordResetEmail(user.email, resetUrl.toString());
      } catch (error) {
        await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
        if (error instanceof EmailDeliveryError) {
          console.error('Brevo password-reset delivery failed:', error.code, error.status || '');
        } else {
          console.error('Brevo password-reset delivery failed.');
        }
      }
    }

    res.status(202).json({
      message: 'If an approved account exists for that email, password reset instructions will be sent.'
    });
  }));

  router.post('/reset-password', resetLimiter, asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(input.token);
    const now = new Date();
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);

    await prisma.$transaction(async tx => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, status: true } } }
      });
      if (!resetToken || resetToken.expiresAt <= now || resetToken.user.status !== 'APPROVED') {
        throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired.');
      }

      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: resetToken.id, expiresAt: { gt: now } }
      });
      if (consumed.count !== 1) {
        throw new HttpError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or has expired.');
      }

      await tx.user.update({
        where: { id: resetToken.user.id },
        data: { passwordHash }
      });
      await tx.session.deleteMany({ where: { userId: resetToken.user.id } });
      await tx.auditLog.create({
        data: {
          type: 'PASSWORD_RESET',
          action: 'Password reset',
          detail: 'Password reset using a single-use link',
          target: resetToken.user.id,
          actorId: resetToken.user.id
        }
      });
    });

    res.json({ message: 'Your password has been reset. You can now sign in.' });
  }));

  router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new HttpError(400, 'CURRENT_PASSWORD_INVALID', 'The current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_ROUNDS);
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({
        where: { userId: user.id, ...(req.sessionId ? { id: { not: req.sessionId } } : {}) }
      });
      await tx.auditLog.create({
        data: {
          type: 'UPDATE',
          action: user.fullName,
          detail: 'Changed account password',
          target: user.email,
          actorId: user.id
        }
      });
    });

    res.json({ message: 'Password updated.' });
  }));

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: serializeUser(req.user) });
  });

  router.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          type: 'LOGOUT',
          action: req.user.fullName,
          detail: `${req.user.role === 'ADMIN' ? 'Administrator' : 'Teacher'} logged out`,
          target: req.user.email,
          actorId: req.user.id
        }
      });
    }
    clearSessionCookie(res, production);
    res.status(204).end();
  }));

  return router;
}
