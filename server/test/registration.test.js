import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { TEACHER_COLLEGES } from '../../shared/teacher-colleges.js';

process.env.DATABASE_URL ||= 'mysql://test:test@localhost:3306/eindex_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-only-jwt-secret-with-at-least-32-characters';

const { createApp } = await import('../src/app.js');
const adminPasswordHash = await bcrypt.hash('AdminPass123!', 4);
const teacherPasswordHash = await bcrypt.hash('TeacherPass123!', 4);

function createFixture(seedUsers = []) {
  const state = {
    users: seedUsers.map(user => ({ ...user })),
    registrations: [],
    sessions: [],
    notifications: [],
    auditLogs: []
  };

  function matches(record, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return value.some(condition => matches(record, condition));
      if (value && typeof value === 'object' && Array.isArray(value.in)) {
        return value.in.includes(record[key]);
      }
      return record[key] === value;
    });
  }

  function findUser(where = {}) {
    return state.users.find(user => matches(user, where)) || null;
  }

  function transactionClient() {
    return {
      user: {
        findUnique: async ({ where }) => findUser(where),
        findMany: async ({ where }) => state.users.filter(user => matches(user, where)),
        create: async ({ data }) => {
          const user = {
            id: `user-${state.users.length + 1}`,
            staffId: null,
            registeredAt: new Date(),
            lastLoginAt: null,
            photo: '',
            appearance: 'Light',
            ...data
          };
          state.users.push(user);
          return user;
        },
        update: async ({ where, data }) => {
          const user = findUser(where);
          if (!user) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
          Object.assign(user, data);
          return user;
        }
      },
      teacherRegistration: {
        create: async ({ data }) => {
          const registration = {
            id: `registration-${state.registrations.length + 1}`,
            status: 'PENDING',
            submittedAt: new Date(),
            decidedAt: null,
            ...data
          };
          state.registrations.push(registration);
          return registration;
        },
        findUnique: async ({ where }) => {
          const registration = state.registrations.find(item => matches(item, where));
          return registration ? { ...registration, user: findUser({ id: registration.userId }) } : null;
        },
        findMany: async () => state.registrations.map(item => ({
          ...item,
          user: findUser({ id: item.userId })
        })),
        updateMany: async ({ where, data }) => {
          const records = state.registrations.filter(item => matches(item, where));
          records.forEach(item => Object.assign(item, data));
          return { count: records.length };
        }
      },
      session: {
        create: async ({ data }) => {
          const session = { id: `session-${state.sessions.length + 1}`, ...data };
          state.sessions.push(session);
          return session;
        }
      },
      notification: {
        create: async ({ data }) => {
          const notification = { id: `notification-${state.notifications.length + 1}`, read: false, createdAt: new Date(), ...data };
          state.notifications.push(notification);
          return notification;
        },
        createMany: async ({ data }) => {
          state.notifications.push(...data.map((item, index) => ({
            id: `notification-${state.notifications.length + index + 1}`,
            read: false,
            createdAt: new Date(),
            ...item
          })));
          return { count: data.length };
        }
      },
      auditLog: {
        create: async ({ data }) => {
          const entry = { id: `audit-${state.auditLogs.length + 1}`, createdAt: new Date(), ...data };
          state.auditLogs.push(entry);
          return entry;
        }
      }
    };
  }

  const prisma = {
    $transaction: operation => operation(transactionClient()),
    user: {
      findUnique: async ({ where }) => findUser(where),
      findMany: async ({ where }) => state.users.filter(user => matches(user, where)),
      findFirst: async ({ where }) => findUser(where)
    },
    session: {
      findUnique: async ({ where }) => {
        const session = state.sessions.find(item => matches(item, where));
        return session ? { ...session, user: findUser({ id: session.userId }) } : null;
      },
      delete: async ({ where }) => {
        state.sessions = state.sessions.filter(item => !matches(item, where));
      },
      deleteMany: async ({ where }) => {
        const before = state.sessions.length;
        state.sessions = state.sessions.filter(item => !matches(item, where));
        return { count: before - state.sessions.length };
      }
    },
    teacherRegistration: {
      findMany: async () => state.registrations.map(item => ({
        ...item,
        user: findUser({ id: item.userId })
      }))
    },
    academicClass: { findMany: async () => [] },
    student: { findMany: async () => [] },
    attendance: { findMany: async () => [] },
    grade: { findMany: async () => [] },
    notification: {
      findMany: async ({ where }) => state.notifications.filter(item => matches(item, where))
    },
    auditLog: {
      findMany: async ({ where }) => state.auditLogs.filter(item => matches(item, where)).map(item => ({
        ...item,
        actor: findUser({ id: item.actorId })
      }))
    }
  };

  return { state, prisma };
}

function approvedAccount({ id, email, fullName, role, department, staffId, passwordHash }) {
  return {
    id,
    email,
    fullName,
    role,
    department,
    staffId,
    passwordHash,
    status: 'APPROVED',
    photo: '',
    notificationPreferences: { updates: true, attendance: true, announcements: true },
    appearance: 'Light'
  };
}

function appFor(fixture, options = {}) {
  return createApp({
    prisma: fixture.prisma,
    allowedOrigins: ['http://localhost:5173'],
    production: false,
    ...options
  });
}

function registrationPayload(index, department) {
  return {
    name: `Teacher ${index}`,
    email: `teacher${index}@example.test`,
    department,
    password: 'TeacherPass123!',
    confirmPassword: 'TeacherPass123!'
  };
}

test('all provisional colleges register as pending teacher accounts only', async () => {
  const admin = approvedAccount({
    id: 'admin-1',
    email: 'admin@example.test',
    fullName: 'Test Admin',
    role: 'ADMIN',
    department: 'Administration',
    staffId: null,
    passwordHash: adminPasswordHash
  });
  const fixture = createFixture([admin]);
  const app = appFor(fixture);

  for (const [index, department] of TEACHER_COLLEGES.entries()) {
    const payload = registrationPayload(index + 1, department);
    if (index === 0) {
      payload.role = 'ADMIN';
      payload.status = 'APPROVED';
    }
    const response = await request(app).post('/api/auth/register').send(payload);

    assert.equal(response.status, 201);
    assert.equal(response.body.registration.status, 'PENDING');
  }

  const registeredTeachers = fixture.state.users.filter(user => user.role === 'TEACHER');
  assert.equal(registeredTeachers.length, TEACHER_COLLEGES.length);
  assert.deepEqual(registeredTeachers.map(user => user.department), [...TEACHER_COLLEGES]);
  assert.ok(registeredTeachers.every(user => user.status === 'PENDING'));
  assert.ok(registeredTeachers.every(user => user.staffId === null));
  assert.ok(await bcrypt.compare('TeacherPass123!', registeredTeachers[0].passwordHash));
  assert.ok(registeredTeachers.every(user => user.passwordHash !== 'TeacherPass123!'));
  assert.equal(fixture.state.registrations.length, TEACHER_COLLEGES.length);
  assert.ok(fixture.state.registrations.every(item => item.status === 'PENDING'));
  assert.equal(fixture.state.notifications.length, TEACHER_COLLEGES.length);
  assert.equal(fixture.state.auditLogs.length, TEACHER_COLLEGES.length);
});

test('registration validates required fields, email, college, and password confirmation', async () => {
  const fixture = createFixture();
  const app = appFor(fixture);
  const valid = registrationPayload(1, TEACHER_COLLEGES[0]);

  for (const field of ['name', 'email', 'department', 'password', 'confirmPassword']) {
    const payload = { ...valid };
    delete payload[field];
    const response = await request(app).post('/api/auth/register').send(payload);
    assert.equal(response.status, 400, `${field} is required`);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }

  const invalidEmail = await request(app).post('/api/auth/register').send({
    ...valid,
    email: 'not-an-email'
  });
  assert.equal(invalidEmail.status, 400);
  assert.match(invalidEmail.body.error.details[0].message, /valid school email/i);

  const invalidCollege = await request(app).post('/api/auth/register').send({
    ...valid,
    department: 'Computer Studies'
  });
  assert.equal(invalidCollege.status, 400);
  assert.match(invalidCollege.body.error.details[0].message, /college/i);

  const mismatchedPassword = await request(app).post('/api/auth/register').send({
    ...valid,
    confirmPassword: 'DifferentPass123!'
  });
  assert.equal(mismatchedPassword.status, 400);
  assert.match(mismatchedPassword.body.error.details[0].message, /do not match/i);
  assert.equal(fixture.state.users.length, 0);
  assert.equal(fixture.state.registrations.length, 0);
});

test('duplicate registration emails are normalized and return a clear conflict', async () => {
  const existingUser = approvedAccount({
    id: 'teacher-existing',
    email: 'teacher1@example.test',
    fullName: 'Existing Teacher',
    role: 'TEACHER',
    department: TEACHER_COLLEGES[0],
    staffId: '123456',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([existingUser]);
  const response = await request(appFor(fixture))
    .post('/api/auth/register')
    .send({ ...registrationPayload(2, TEACHER_COLLEGES[1]), email: ' TEACHER1@EXAMPLE.TEST ' });

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EMAIL_IN_USE');
  assert.match(response.body.error.message, /already exists/i);
  assert.equal(fixture.state.users.length, 1);
  assert.equal(fixture.state.registrations.length, 0);
});

test('administrators approve or reject registrations, notify applicants, and preserve the college', async () => {
  const admin = approvedAccount({
    id: 'admin-1',
    email: 'admin@example.test',
    fullName: 'Test Admin',
    role: 'ADMIN',
    department: 'Administration',
    staffId: null,
    passwordHash: adminPasswordHash
  });
  const activeTeacher = approvedAccount({
    id: 'teacher-active',
    email: 'active@example.test',
    fullName: 'Active Teacher',
    role: 'TEACHER',
    department: TEACHER_COLLEGES[0],
    staffId: '654321',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([admin, activeTeacher]);
  const submittedEmails = [];
  const app = appFor(fixture, {
    sendTeacherRegistrationDecisionEmail: async (to, decision) => submittedEmails.push({ to, ...decision })
  });
  const approvedPayload = registrationPayload(1, TEACHER_COLLEGES[2]);
  const rejectedPayload = registrationPayload(2, TEACHER_COLLEGES[8]);
  const approvedRegistration = await request(app).post('/api/auth/register').send(approvedPayload);
  const rejectedRegistration = await request(app).post('/api/auth/register').send(rejectedPayload);
  const approvedId = approvedRegistration.body.registration.id;
  const rejectedId = rejectedRegistration.body.registration.id;

  const unauthenticatedDecision = await request(app)
    .patch(`/api/data/registrations/${approvedId}`)
    .send({ status: 'APPROVED' });
  assert.equal(unauthenticatedDecision.status, 401);

  const teacherAgent = request.agent(app);
  const teacherLogin = await teacherAgent.post('/api/auth/login').send({
    email: activeTeacher.email,
    password: 'TeacherPass123!'
  });
  assert.equal(teacherLogin.status, 200);
  const forbiddenDecision = await teacherAgent
    .patch(`/api/data/registrations/${approvedId}`)
    .send({ status: 'APPROVED' });
  assert.equal(forbiddenDecision.status, 403);

  const adminAgent = request.agent(app);
  const adminLogin = await adminAgent.post('/api/auth/login').send({
    email: admin.email,
    password: 'AdminPass123!'
  });
  assert.equal(adminLogin.status, 200);

  const approval = await adminAgent
    .patch(`/api/data/registrations/${approvedId}`)
    .send({ status: 'APPROVED' });
  assert.equal(approval.status, 200);
  assert.deepEqual(approval.body, { emailNotification: 'submitted' });

  const approvedUser = fixture.state.users.find(user => user.email === approvedPayload.email);
  const approvedRecord = fixture.state.registrations.find(item => item.id === approvedId);
  assert.equal(approvedUser.status, 'APPROVED');
  assert.match(approvedUser.staffId, /^\d{6}$/);
  assert.equal(approvedUser.department, TEACHER_COLLEGES[2]);
  assert.equal(approvedRecord.status, 'APPROVED');
  assert.ok(approvedRecord.decidedAt instanceof Date);
  assert.ok(fixture.state.notifications.some(item => item.userId === approvedUser.id && /ready to use/i.test(item.detail)));
  assert.equal(submittedEmails[0].to, approvedUser.email);
  assert.equal(submittedEmails[0].status, 'APPROVED');
  assert.equal(submittedEmails[0].department, TEACHER_COLLEGES[2]);
  assert.equal(submittedEmails[0].staffId, approvedUser.staffId);
  assert.match(submittedEmails[0].loginUrl, /\/login$/);

  const adminData = await adminAgent.get('/api/data');
  assert.equal(adminData.status, 200);
  assert.equal(adminData.body.teachers.find(item => item.email === approvedUser.email).department, TEACHER_COLLEGES[2]);
  assert.equal(adminData.body.registrations.find(item => item.id === approvedId).department, TEACHER_COLLEGES[2]);

  const approvedTeacherAgent = request.agent(app);
  const approvedLogin = await approvedTeacherAgent.post('/api/auth/login').send({
    email: approvedPayload.email,
    password: approvedPayload.password
  });
  assert.equal(approvedLogin.status, 200);
  assert.equal(approvedLogin.body.user.role, 'teacher');
  assert.equal(approvedLogin.body.user.department, TEACHER_COLLEGES[2]);
  const teacherData = await approvedTeacherAgent.get('/api/data');
  assert.equal(teacherData.status, 200);
  assert.equal(teacherData.body.settings[`teacher:${approvedPayload.email}`].department, TEACHER_COLLEGES[2]);

  const rejection = await adminAgent
    .patch(`/api/data/registrations/${rejectedId}`)
    .send({ status: 'REJECTED' });
  assert.equal(rejection.status, 200);
  assert.deepEqual(rejection.body, { emailNotification: 'submitted' });
  const rejectedUser = fixture.state.users.find(user => user.email === rejectedPayload.email);
  const rejectedRecord = fixture.state.registrations.find(item => item.id === rejectedId);
  assert.equal(rejectedUser.status, 'REJECTED');
  assert.equal(rejectedUser.staffId, null);
  assert.equal(rejectedRecord.status, 'REJECTED');
  assert.ok(fixture.state.notifications.some(item => item.userId === rejectedUser.id && /not approved/i.test(item.detail)));
  assert.equal(submittedEmails[1].to, rejectedUser.email);
  assert.equal(submittedEmails[1].status, 'REJECTED');
  assert.equal(submittedEmails[1].department, TEACHER_COLLEGES[8]);

  const rejectedLogin = await request(app).post('/api/auth/login').send({
    email: rejectedPayload.email,
    password: rejectedPayload.password
  });
  assert.equal(rejectedLogin.status, 403);
  assert.equal(rejectedLogin.body.error.code, 'ACCOUNT_INACTIVE');
  assert.equal(fixture.state.auditLogs.filter(item => ['APPROVED', 'REJECTED'].includes(item.type)).length, 2);
});

test('a saved approval reports when the applicant email could not be submitted', async () => {
  const admin = approvedAccount({
    id: 'admin-1',
    email: 'admin@example.test',
    fullName: 'Test Admin',
    role: 'ADMIN',
    department: 'Administration',
    staffId: null,
    passwordHash: adminPasswordHash
  });
  const fixture = createFixture([admin]);
  const app = appFor(fixture, {
    sendTeacherRegistrationDecisionEmail: async () => {
      throw new Error('provider details must not be sent to the client');
    }
  });
  const payload = registrationPayload(1, TEACHER_COLLEGES[0]);
  const registration = await request(app).post('/api/auth/register').send(payload);
  const adminAgent = request.agent(app);
  await adminAgent.post('/api/auth/login').send({
    email: admin.email,
    password: 'AdminPass123!'
  });

  const loggedErrors = [];
  const originalError = console.error;
  console.error = (...args) => loggedErrors.push(args);
  let response;
  try {
    response = await adminAgent
      .patch(`/api/data/registrations/${registration.body.registration.id}`)
      .send({ status: 'APPROVED' });
  } finally {
    console.error = originalError;
  }

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { emailNotification: 'failed' });
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0][0], 'Brevo registration decision email failed.');
  assert.equal(fixture.state.users.find(user => user.email === payload.email).status, 'APPROVED');
  assert.equal(fixture.state.notifications.length, 2);
  assert.equal(fixture.state.auditLogs.filter(item => item.type === 'APPROVED').length, 1);
});
