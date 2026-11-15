import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from './env.js';
import { EmailDeliveryError, sendPasswordResetEmail } from './brevo.js';
import { asyncHandler, HttpError } from './errors.js';
import { requireAuth, requireRole } from './auth.js';

const roleName = role => role === 'ADMIN' ? 'admin' : 'teacher';
const displayStatus = status => status.toLowerCase().replace(/^\w/, letter => letter.toUpperCase());
const formatDate = value => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const formatTime = value => value ? new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
const attendanceStatus = status => displayStatus(status);
const attendanceStatusValue = z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']);

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  department: z.string().trim().min(1).max(120),
  photo: z.string().max(4_000_000).optional()
});

const preferencesSchema = z.object({
  notificationPreferences: z.object({
    updates: z.boolean(),
    attendance: z.boolean(),
    announcements: z.boolean()
  }),
  appearance: z.enum(['Light', 'Dark'])
});

function auditData(user, type, detail, target) {
  return {
    type,
    action: user.fullName,
    detail,
    target,
    actorId: user.id
  };
}

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function createStaffId(tx) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const staffId = String(randomInt(100000, 1000000));
    const existing = await tx.user.findUnique({ where: { staffId }, select: { id: true } });
    if (!existing) return staffId;
  }
  throw new HttpError(503, 'STAFF_ID_UNAVAILABLE', 'A staff ID could not be assigned. Try again.');
}

async function syncPendingRegistration(tx, userId, status) {
  if (!['APPROVED', 'REJECTED'].includes(status)) return;
  await tx.teacherRegistration.updateMany({
    where: { userId, status: 'PENDING' },
    data: { status, decidedAt: new Date() }
  });
}

function serializeTeacher(user) {
  return {
    id: user.staffId || user.id,
    accountId: user.id,
    name: user.fullName,
    department: user.department,
    email: user.email,
    role: 'Teacher',
    status: displayStatus(user.status),
    active: user.status === 'APPROVED',
    registered: formatDate(user.registeredAt),
    last: formatDate(user.lastLoginAt)
  };
}

export function createDataRouter(prisma) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', asyncHandler(async (req, res) => {
    const admin = req.user.role === 'ADMIN';
    const teacherFilter = admin ? { role: 'TEACHER' } : { id: req.user.id, role: 'TEACHER' };
    const classFilter = admin ? {} : { teachers: { some: { teacherId: req.user.id } } };
    const studentFilter = admin ? {} : {
      enrollments: {
        some: {
          section: { academicClass: { teachers: { some: { teacherId: req.user.id } } } }
        }
      }
    };
    const attendanceFilter = admin ? {} : { teacherId: req.user.id };
    const gradeFilter = admin ? {} : {
      section: { academicClass: { teachers: { some: { teacherId: req.user.id } } } }
    };
    const auditFilter = admin ? {} : { actorId: req.user.id };

    const [users, classes, students, attendance, grades, registrations, audit, notifications] = await Promise.all([
      prisma.user.findMany({
        where: teacherFilter,
        select: {
          id: true, staffId: true, fullName: true, email: true, department: true,
          status: true, registeredAt: true, lastLoginAt: true
        },
        orderBy: { registeredAt: 'desc' },
        take: 5000
      }),
      prisma.academicClass.findMany({
        where: classFilter,
        include: { sections: { orderBy: { name: 'asc' } } },
        orderBy: { name: 'asc' },
        take: 1000
      }),
      prisma.student.findMany({
        where: studentFilter,
        include: {
          enrollments: {
            include: { section: { include: { academicClass: true } } },
            take: 1
          }
        },
        orderBy: { name: 'asc' },
        take: 10000
      }),
      prisma.attendance.findMany({
        where: attendanceFilter,
        include: { student: true, section: { include: { academicClass: true } } },
        orderBy: [{ date: 'desc' }, { time: 'desc' }],
        take: 10000
      }),
      prisma.grade.findMany({
        where: gradeFilter,
        include: { section: { include: { academicClass: true } } },
        take: 10000
      }),
      admin ? prisma.teacherRegistration.findMany({
        include: { user: { select: { id: true, fullName: true, email: true, department: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 5000
      }) : Promise.resolve([]),
      prisma.auditLog.findMany({
        where: auditFilter,
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    const teacherName = req.user.fullName.split(/\s+/);
    const settingsKey = admin ? 'admin' : `teacher:${req.user.email}`;
    const data = {
      teachers: users.map(serializeTeacher),
      classes: classes.map(item => ({
        id: item.id,
        name: item.name,
        sections: item.sections.length,
        course: item.course,
        year: item.yearLevel,
        schedule: item.schedule,
        sectionNames: item.sections.map(section => section.name)
      })),
      students: students.map(item => {
        const section = item.enrollments[0]?.section;
        return {
          id: item.id,
          name: item.name,
          program: item.program,
          year: item.yearLevel,
          status: item.status,
          rfid: item.rfid || '',
          sectionId: section?.id || '',
          section: section?.name || '',
          className: section?.academicClass.name || ''
        };
      }),
      attendance: attendance.map(item => ({
        id: item.studentId,
        attendanceId: item.id,
        studentId: item.studentId,
        sectionId: item.sectionId,
        name: item.student.name,
        className: item.section.academicClass.name,
        section: item.section.name,
        date: new Date(item.date).toISOString().slice(0, 10),
        status: attendanceStatus(item.status),
        time: item.time,
        remarks: item.remarks,
        rfid: item.student.rfid || ''
      })),
      grades: grades.map(item => ({
        studentId: item.studentId,
        className: item.section.academicClass.name,
        section: item.section.name,
        period: item.period,
        quizzes: item.quizzes,
        examinations: item.examinations,
        activities: item.activities,
        assessments: item.assessments
      })),
      registrations: registrations.map(item => ({
        id: item.id,
        accountId: item.userId,
        name: item.user.fullName,
        email: item.user.email,
        department: item.user.department,
        submitted: formatDate(item.submittedAt),
        status: displayStatus(item.status)
      })),
      audit: audit.map(item => ({
        id: item.id,
        type: item.type,
        action: item.action,
        detail: item.detail,
        target: item.target,
        actor: item.actor?.fullName || 'System',
        time: item.createdAt.toISOString()
      })),
      notifications: notifications.map(item => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        read: item.read,
        role: roleName(req.user.role),
        time: item.createdAt.toISOString()
      })),
      settings: {
        [settingsKey]: {
          firstName: teacherName[0] || '',
          lastName: teacherName.slice(1).join(' '),
          email: req.user.email,
          department: req.user.department,
          photo: req.user.photo || '',
          notifications: req.user.notificationPreferences || { updates: true, attendance: true, announcements: true },
          appearance: req.user.appearance || 'Light'
        }
      }
    };

    res.json(data);
  }));

  router.patch('/profile', asyncHandler(async (req, res) => {
    const input = profileSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName: input.fullName, email: input.email, department: input.department, ...(input.photo !== undefined ? { photo: input.photo } : {}) }
    });
    await prisma.auditLog.create({
      data: auditData(updated, 'UPDATE', 'Updated account profile', updated.email)
    });
    res.json({ user: { id: updated.id, fullName: updated.fullName, name: updated.fullName, email: updated.email, department: updated.department, photo: updated.photo } });
  }));

  router.patch('/preferences', asyncHandler(async (req, res) => {
    const input = preferencesSchema.parse(req.body);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationPreferences: input.notificationPreferences, appearance: input.appearance }
    });
    res.status(204).end();
  }));

  router.patch('/notifications/read-all', asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.status(204).end();
  }));

  router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true }
    });
    if (!result.count) throw new HttpError(404, 'NOT_FOUND', 'The notification was not found.');
    res.status(204).end();
  }));

  router.post('/teachers', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const input = z.object({
      fullName: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
      department: z.string().trim().min(1).max(120),
      staffId: z.string().trim().regex(/^\d{1,32}$/),
      status: z.enum(['APPROVED', 'PENDING'])
    }).parse(req.body);
    const temporaryPassword = randomBytes(32).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const resetToken = randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(resetToken);
    const requestOrigin = req.get('origin');
    const sameOrigin = requestOrigin === `${req.protocol}://${req.get('host')}`;
    const baseOrigin = requestOrigin && (env.allowedOrigins.includes(requestOrigin) || sameOrigin)
      ? requestOrigin
      : env.FRONTEND_URL || env.allowedOrigins[0];
    const resetUrl = new URL('/reset-password', `${baseOrigin}/`);
    resetUrl.searchParams.set('token', resetToken);

    const created = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          department: input.department,
          staffId: input.staffId,
          role: 'TEACHER',
          status: input.status,
          photo: '',
          notificationPreferences: { updates: true, attendance: true, announcements: true }
        }
      });
      if (input.status === 'APPROVED') {
        await tx.passwordResetToken.create({
          data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
        });
      } else {
        await tx.teacherRegistration.create({ data: { userId: user.id } });
      }
      return user;
    });

    if (created.status === 'APPROVED') {
      try {
        await sendPasswordResetEmail(created.email, resetUrl.toString());
      } catch (error) {
        await prisma.user.delete({ where: { id: created.id } });
        if (error instanceof EmailDeliveryError) {
          console.error('Brevo teacher setup email failed:', error.code, error.status || '');
        }
        throw new HttpError(502, 'EMAIL_DELIVERY_FAILED', 'The teacher account could not be created because the password setup email could not be sent.');
      }
    }

    await prisma.auditLog.create({
      data: auditData(req.user, 'CREATE', `Added teacher account for ${created.fullName}`, created.email)
    });
    res.status(201).json({ teacher: serializeTeacher(created) });
  }));

  router.patch('/teachers/:identifier', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const input = z.object({
      fullName: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
      department: z.string().trim().min(1).max(120),
      staffId: z.string().trim().regex(/^\d{1,32}$/),
      status: z.enum(['APPROVED', 'PENDING', 'REJECTED', 'INACTIVE'])
    }).parse(req.body);
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER', OR: [{ id: req.params.identifier }, { staffId: req.params.identifier }] }
    });
    if (!teacher) throw new HttpError(404, 'NOT_FOUND', 'The teacher account was not found.');
    const updated = await prisma.$transaction(async tx => {
      const account = await tx.user.update({
        where: { id: teacher.id },
        data: { fullName: input.fullName, email: input.email, department: input.department, staffId: input.staffId, status: input.status }
      });
      await syncPendingRegistration(tx, account.id, input.status);
      await tx.auditLog.create({
        data: auditData(req.user, 'UPDATE', `Updated teacher account for ${account.fullName}`, account.email)
      });
      return account;
    });
    res.json({ teacher: serializeTeacher(updated) });
  }));

  router.patch('/teachers/:identifier/status', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(['APPROVED', 'PENDING', 'REJECTED', 'INACTIVE']) }).parse(req.body);
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER', OR: [{ id: req.params.identifier }, { staffId: req.params.identifier }] }
    });
    if (!teacher) throw new HttpError(404, 'NOT_FOUND', 'The teacher account was not found.');
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: teacher.id }, data: { status } });
      await syncPendingRegistration(tx, teacher.id, status);
      await tx.auditLog.create({
        data: auditData(req.user, 'UPDATE', `Changed ${teacher.fullName}'s account status to ${displayStatus(status)}`, teacher.email)
      });
    });
    res.status(204).end();
  }));

  router.patch('/teacher-bulk-status', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const input = z.object({
      identifiers: z.array(z.string().min(1).max(191)).min(1).max(500),
      status: z.enum(['APPROVED', 'INACTIVE'])
    }).parse(req.body);
    const where = {
        role: 'TEACHER',
        OR: [{ id: { in: input.identifiers } }, { staffId: { in: input.identifiers } }]
      };
    const count = await prisma.$transaction(async tx => {
      const users = await tx.user.findMany({ where, select: { id: true } });
      const result = await tx.user.updateMany({ where, data: { status: input.status } });
      if (input.status === 'APPROVED' && users.length) {
        await tx.teacherRegistration.updateMany({
          where: { userId: { in: users.map(user => user.id) }, status: 'PENDING' },
          data: { status: 'APPROVED', decidedAt: new Date() }
        });
      }
      await tx.auditLog.create({
        data: auditData(req.user, 'UPDATE', `Changed ${result.count} teacher account status(es) to ${displayStatus(input.status)}`, input.identifiers.join(', '))
      });
      return result.count;
    });
    res.json({ updated: count });
  }));

  router.patch('/registrations/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
    await prisma.$transaction(async tx => {
      const registration = await tx.teacherRegistration.findUnique({
        where: { id: req.params.id },
        include: { user: true }
      });
      if (!registration) throw new HttpError(404, 'NOT_FOUND', 'The registration was not found.');
      if (registration.status !== 'PENDING') {
        throw new HttpError(409, 'ALREADY_DECIDED', 'This registration has already been reviewed.');
      }
      const staffId = status === 'APPROVED' && !registration.user.staffId
        ? await createStaffId(tx)
        : registration.user.staffId;
      const decision = await tx.teacherRegistration.updateMany({
        where: { id: registration.id, status: 'PENDING' },
        data: { status, decidedAt: new Date() }
      });
      if (decision.count !== 1) throw new HttpError(409, 'ALREADY_DECIDED', 'This registration has already been reviewed.');
      await tx.user.update({
        where: { id: registration.userId },
        data: { status, ...(staffId ? { staffId } : {}) }
      });
      await tx.notification.create({
        data: {
          userId: registration.userId,
          title: `Teacher registration ${status.toLowerCase()}`,
          detail: status === 'APPROVED' ? 'Your teacher account is ready to use.' : 'Your teacher access request was not approved.'
        }
      });
      await tx.auditLog.create({
        data: auditData(req.user, status, `${displayStatus(status)} teacher registration for ${registration.user.fullName}`, registration.user.email)
      });
    });
    res.status(204).end();
  }));

  router.patch('/attendance/:id', requireRole('TEACHER'), asyncHandler(async (req, res) => {
    const input = z.object({
      status: attendanceStatusValue.optional(),
      remarks: z.string().max(1000).optional()
    }).refine(value => value.status !== undefined || value.remarks !== undefined).parse(req.body);
    const attendance = await prisma.attendance.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
      include: { student: true }
    });
    if (!attendance) throw new HttpError(404, 'NOT_FOUND', 'The attendance record was not found.');
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        ...(input.status ? { time: input.status === 'ABSENT' ? '—' : attendance.time === '—' ? formatTime(new Date()) : attendance.time } : {})
      }
    });
    await prisma.auditLog.create({
      data: auditData(req.user, 'ATTENDANCE', `Updated attendance for ${attendance.student.name}`, attendance.studentId)
    });
    res.status(204).end();
  }));

  router.post('/attendance/scan', requireRole('TEACHER'), asyncHandler(async (req, res) => {
    const input = z.object({
      studentId: z.string().min(1).max(191),
      sectionId: z.string().min(1).max(191),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().max(32)
    }).parse(req.body);
    const date = new Date(`${input.date}T00:00:00.000Z`);
    const section = await prisma.classSection.findFirst({
      where: {
        id: input.sectionId,
        academicClass: { teachers: { some: { teacherId: req.user.id } } },
        enrollments: { some: { studentId: input.studentId } }
      },
      select: { id: true }
    });
    if (!section) throw new HttpError(404, 'NOT_FOUND', 'The student was not found in an assigned class.');

    const record = await prisma.attendance.upsert({
      where: { studentId_sectionId_date: { studentId: input.studentId, sectionId: section.id, date } },
      create: {
        studentId: input.studentId,
        sectionId: section.id,
        teacherId: req.user.id,
        date,
        status: 'PRESENT',
        time: input.time,
        remarks: ''
      },
      update: { status: 'PRESENT', time: input.time, teacherId: req.user.id }
    });
    await prisma.auditLog.create({
      data: auditData(req.user, 'ATTENDANCE', 'RFID scan recorded attendance', input.studentId)
    });
    res.status(200).json({ attendanceId: record.id });
  }));

  return router;
}
