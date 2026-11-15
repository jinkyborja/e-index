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
const TEST_COLLEGES = TEACHER_COLLEGES.map((college, index) => ({
  ...college,
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
}));
const UNKNOWN_COLLEGE_ID = '00000000-0000-4000-8000-000000000099';

function createFixture(seedUsers = [], {
  activeCollegeCodes = TEST_COLLEGES.map(college => college.code)
} = {}) {
  const state = {
    users: seedUsers.map(user => ({ ...user })),
    colleges: TEST_COLLEGES.map(college => ({
      ...college,
      isActive: activeCollegeCodes.includes(college.code)
    })),
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

  function hydrateUser(user) {
    if (!user) return null;
    return {
      ...user,
      college: state.colleges.find(college => college.id === user.collegeId) || null
    };
  }

  function findCollege(where = {}) {
    return state.colleges.find(college => matches(college, where)) || null;
  }

  function transactionClient() {
    return {
      user: {
        findUnique: async ({ where }) => hydrateUser(findUser(where)),
        findMany: async ({ where }) => state.users.filter(user => matches(user, where)).map(hydrateUser),
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
          return hydrateUser(user);
        },
        update: async ({ where, data }) => {
          const user = findUser(where);
          if (!user) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
          Object.assign(user, data);
          return hydrateUser(user);
        }
      },
      college: {
        findUnique: async ({ where }) => findCollege(where),
        update: async ({ where, data }) => {
          const college = findCollege(where);
          if (!college) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
          Object.assign(college, data);
          return college;
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
          return registration ? { ...registration, user: hydrateUser(findUser({ id: registration.userId })) } : null;
        },
        findMany: async () => state.registrations.map(item => ({
          ...item,
          user: hydrateUser(findUser({ id: item.userId }))
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
      findUnique: async ({ where }) => hydrateUser(findUser(where)),
      findMany: async ({ where }) => state.users.filter(user => matches(user, where)).map(hydrateUser),
      findFirst: async ({ where }) => hydrateUser(findUser(where)),
      update: async ({ where, data }) => {
        const user = findUser(where);
        if (!user) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
        Object.assign(user, data);
        return hydrateUser(user);
      }
    },
    college: {
      findMany: async ({ where = {} } = {}) => state.colleges.filter(college => matches(college, where)),
      findUnique: async ({ where }) => findCollege(where)
    },
    session: {
      findUnique: async ({ where }) => {
        const session = state.sessions.find(item => matches(item, where));
        return session ? { ...session, user: hydrateUser(findUser({ id: session.userId })) } : null;
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
      create: async ({ data }) => {
        const entry = { id: `audit-${state.auditLogs.length + 1}`, createdAt: new Date(), ...data };
        state.auditLogs.push(entry);
        return entry;
      },
      findMany: async ({ where }) => state.auditLogs.filter(item => matches(item, where)).map(item => ({
        ...item,
        actor: hydrateUser(findUser({ id: item.actorId }))
      }))
    }
  };

  return { state, prisma };
}

function approvedAccount({ id, email, fullName, role, department, collegeId = null, staffId, passwordHash }) {
  return {
    id,
    email,
    fullName,
    role,
    department,
    collegeId,
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

function registrationPayload(index, college = TEST_COLLEGES[0]) {
  return {
    name: `Teacher ${index}`,
    email: `teacher${index}@example.test`,
    collegeId: college.id,
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

  for (const [index, college] of TEST_COLLEGES.entries()) {
    const payload = registrationPayload(index + 1, college);
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
  assert.deepEqual(registeredTeachers.map(user => user.department), TEST_COLLEGES.map(college => college.name));
  assert.deepEqual(registeredTeachers.map(user => user.collegeId), TEST_COLLEGES.map(college => college.id));
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
  const valid = registrationPayload(1, TEST_COLLEGES[0]);

  for (const field of ['name', 'email', 'collegeId', 'password', 'confirmPassword']) {
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
    collegeId: UNKNOWN_COLLEGE_ID
  });
  assert.equal(invalidCollege.status, 400);
  assert.equal(invalidCollege.body.error.code, 'INVALID_COLLEGE');
  assert.match(invalidCollege.body.error.message, /active college/i);

  const mismatchedPassword = await request(app).post('/api/auth/register').send({
    ...valid,
    confirmPassword: 'DifferentPass123!'
  });
  assert.equal(mismatchedPassword.status, 400);
  assert.match(mismatchedPassword.body.error.details[0].message, /do not match/i);
  assert.equal(fixture.state.users.length, 0);
  assert.equal(fixture.state.registrations.length, 0);
});

test('public college choices include active colleges only', async () => {
  const fixture = createFixture([], { activeCollegeCodes: ['CCS', 'CON'] });
  const response = await request(appFor(fixture)).get('/api/auth/colleges');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, ['CCS', 'CON'].map(code => {
    const college = TEST_COLLEGES.find(item => item.code === code);
    return { id: college.id, code: college.code, name: college.name };
  }));
});

test('registration rejects inactive, unknown, mismatched, and arbitrary legacy college values', async () => {
  const fixture = createFixture([], { activeCollegeCodes: ['CAS'] });
  const app = appFor(fixture);

  for (const payload of [
    registrationPayload(1, TEST_COLLEGES[2]),
    registrationPayload(2, { id: UNKNOWN_COLLEGE_ID }),
    { ...registrationPayload(3, TEST_COLLEGES[0]), department: TEST_COLLEGES[1].name },
    { ...registrationPayload(4), collegeId: undefined, department: 'Computer Studies' }
  ]) {
    const response = await request(app).post('/api/auth/register').send(payload);
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_COLLEGE');
  }

  assert.equal(fixture.state.users.length, 0);
  assert.equal(fixture.state.registrations.length, 0);
});

test('legacy department registration accepts only an exact active college name', async () => {
  const fixture = createFixture([], { activeCollegeCodes: ['CAS'] });
  const legacyPayload = registrationPayload(1);
  delete legacyPayload.collegeId;
  legacyPayload.department = TEST_COLLEGES[0].name;
  const response = await request(appFor(fixture)).post('/api/auth/register').send(legacyPayload);

  assert.equal(response.status, 201);
  assert.equal(fixture.state.users[0].collegeId, TEST_COLLEGES[0].id);
  assert.equal(fixture.state.users[0].department, TEST_COLLEGES[0].name);
});

test('profile edits retain an existing inactive college assignment and legacy department', async () => {
  const college = TEST_COLLEGES.find(item => item.code === 'CCS');
  const teacher = approvedAccount({
    id: 'teacher-inactive-college',
    email: 'inactive@example.test',
    fullName: 'Inactive College Teacher',
    role: 'TEACHER',
    department: 'Computer Studies',
    collegeId: college.id,
    staffId: '123457',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([teacher], { activeCollegeCodes: [] });
  const agent = request.agent(appFor(fixture));
  const login = await agent.post('/api/auth/login').send({
    email: teacher.email,
    password: 'TeacherPass123!'
  });
  assert.equal(login.status, 200);

  const saved = await agent.patch('/api/data/profile').send({
    fullName: 'Updated Teacher Name',
    email: teacher.email,
    collegeId: college.id
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.user.department, 'Computer Studies');
  assert.equal(saved.body.user.collegeId, college.id);
  assert.equal(saved.body.user.collegeName, college.name);
  assert.equal(saved.body.user.collegeIsActive, false);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.department, 'Computer Studies');
  assert.equal(me.body.user.collegeId, college.id);
  assert.equal(fixture.state.users[0].department, 'Computer Studies');
});

test('college activation requires admin confirmation and audits both activation and deactivation', async () => {
  const admin = approvedAccount({
    id: 'admin-1',
    email: 'admin@example.test',
    fullName: 'Test Admin',
    role: 'ADMIN',
    department: 'Administration',
    staffId: null,
    passwordHash: adminPasswordHash
  });
  const teacher = approvedAccount({
    id: 'teacher-1',
    email: 'teacher@example.test',
    fullName: 'Test Teacher',
    role: 'TEACHER',
    department: 'Computer Studies',
    collegeId: TEST_COLLEGES[2].id,
    staffId: '654321',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([admin, teacher], { activeCollegeCodes: [] });
  const app = appFor(fixture);
  const college = TEST_COLLEGES[2];
  const endpoint = `/api/data/colleges/${college.id}/activate`;
  const confirmation = {
    officialNameConfirmed: true,
    guiuanCampusAssignmentConfirmed: true,
    confirmationReference: 'Approved reference'
  };

  const unauthenticated = await request(app).post(endpoint).send(confirmation);
  assert.equal(unauthenticated.status, 401);

  const teacherAgent = request.agent(app);
  await teacherAgent.post('/api/auth/login').send({
    email: teacher.email,
    password: 'TeacherPass123!'
  });
  const forbidden = await teacherAgent.post(endpoint).send(confirmation);
  assert.equal(forbidden.status, 403);

  const adminAgent = request.agent(app);
  await adminAgent.post('/api/auth/login').send({
    email: admin.email,
    password: 'AdminPass123!'
  });
  const preservedTeacher = await adminAgent.patch('/api/data/teachers/teacher-1').send({
    fullName: teacher.fullName,
    email: teacher.email,
    collegeId: college.id,
    staffId: teacher.staffId,
    status: 'APPROVED'
  });
  assert.equal(preservedTeacher.status, 200);
  assert.equal(preservedTeacher.body.teacher.department, 'Computer Studies');
  assert.equal(fixture.state.users.find(item => item.id === teacher.id).collegeId, college.id);

  const incomplete = await adminAgent.post(endpoint).send({
    ...confirmation,
    guiuanCampusAssignmentConfirmed: false
  });
  assert.equal(incomplete.status, 400);
  assert.equal(fixture.state.colleges.find(item => item.id === college.id).isActive, false);

  const activated = await adminAgent.post(endpoint).send(confirmation);
  assert.equal(activated.status, 200);
  assert.equal(activated.body.college.isActive, true);
  assert.ok(fixture.state.auditLogs.some(item => item.type === 'COLLEGE_ACTIVATED'));
  const activeChoices = await request(app).get('/api/auth/colleges');
  assert.ok(activeChoices.body.some(item => item.id === college.id));

  const deactivated = await adminAgent.post(`/api/data/colleges/${college.id}/deactivate`);
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.college.isActive, false);
  assert.ok(fixture.state.auditLogs.some(item => item.type === 'COLLEGE_DEACTIVATED'));
  assert.equal(fixture.state.users.find(item => item.id === teacher.id).collegeId, college.id);
  assert.equal(fixture.state.users.find(item => item.id === teacher.id).department, 'Computer Studies');
});

test('duplicate registration emails are normalized and return a clear conflict', async () => {
  const existingUser = approvedAccount({
    id: 'teacher-existing',
    email: 'teacher1@example.test',
    fullName: 'Existing Teacher',
    role: 'TEACHER',
    department: TEST_COLLEGES[0].name,
    staffId: '123456',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([existingUser]);
  const response = await request(appFor(fixture))
    .post('/api/auth/register')
    .send({ ...registrationPayload(2, TEST_COLLEGES[1]), email: ' TEACHER1@EXAMPLE.TEST ' });

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
    department: TEST_COLLEGES[0].name,
    staffId: '654321',
    passwordHash: teacherPasswordHash
  });
  const fixture = createFixture([admin, activeTeacher]);
  const submittedEmails = [];
  const app = appFor(fixture, {
    sendTeacherRegistrationDecisionEmail: async (to, decision) => submittedEmails.push({ to, ...decision })
  });
  const approvedPayload = registrationPayload(1, TEST_COLLEGES[2]);
  const rejectedPayload = registrationPayload(2, TEST_COLLEGES[8]);
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
  assert.equal(approvedUser.department, TEST_COLLEGES[2].name);
  assert.equal(approvedUser.collegeId, TEST_COLLEGES[2].id);
  assert.equal(approvedRecord.status, 'APPROVED');
  assert.ok(approvedRecord.decidedAt instanceof Date);
  assert.ok(fixture.state.notifications.some(item => item.userId === approvedUser.id && /ready to use/i.test(item.detail)));
  assert.equal(submittedEmails[0].to, approvedUser.email);
  assert.equal(submittedEmails[0].status, 'APPROVED');
  assert.equal(submittedEmails[0].department, TEST_COLLEGES[2].name);
  assert.equal(submittedEmails[0].staffId, approvedUser.staffId);
  assert.match(submittedEmails[0].loginUrl, /\/login$/);

  const adminData = await adminAgent.get('/api/data');
  assert.equal(adminData.status, 200);
  assert.equal(adminData.body.teachers.find(item => item.email === approvedUser.email).department, TEST_COLLEGES[2].name);
  assert.equal(adminData.body.registrations.find(item => item.id === approvedId).department, TEST_COLLEGES[2].name);

  const approvedTeacherAgent = request.agent(app);
  const approvedLogin = await approvedTeacherAgent.post('/api/auth/login').send({
    email: approvedPayload.email,
    password: approvedPayload.password
  });
  assert.equal(approvedLogin.status, 200);
  assert.equal(approvedLogin.body.user.role, 'teacher');
  assert.equal(approvedLogin.body.user.department, TEST_COLLEGES[2].name);
  assert.equal(approvedLogin.body.user.collegeId, TEST_COLLEGES[2].id);
  const teacherData = await approvedTeacherAgent.get('/api/data');
  assert.equal(teacherData.status, 200);
  assert.equal(teacherData.body.settings[`teacher:${approvedPayload.email}`].department, TEST_COLLEGES[2].name);
  assert.equal(teacherData.body.settings[`teacher:${approvedPayload.email}`].collegeName, TEST_COLLEGES[2].name);

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
  assert.equal(submittedEmails[1].department, TEST_COLLEGES[8].name);

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
  const payload = registrationPayload(1, TEST_COLLEGES[0]);
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
