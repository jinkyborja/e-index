import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.DATABASE_URL ||= 'mysql://test:test@localhost:3306/eindex_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-only-jwt-secret-with-at-least-32-characters';

const { createApp, databaseFailureReason } = await import('../src/app.js');
const { missingRequiredEnvironment } = await import('../src/env.js');
const passwordHash = await bcrypt.hash('Teacher123!', 4);

function fakePrisma(account) {
  const sessions = new Map();
  const user = { ...account };
  return {
    sessions,
    $queryRaw: async () => [{ result: 1 }],
    $transaction: operation => operation({
      session: {
        create: async ({ data }) => {
          const record = { id: `session-${sessions.size + 1}`, ...data, user };
          sessions.set(data.tokenHash, record);
          return record;
        }
      },
      user: {
        update: async () => ({ ...user }),
        findUnique: async () => null
      },
      auditLog: { create: async () => ({}) }
    }),
    session: {
      findUnique: async ({ where }) => sessions.get(where.tokenHash) || null,
      delete: async ({ where }) => {
        for (const [hash, record] of sessions) if (record.id === where.id) sessions.delete(hash);
      },
      deleteMany: async ({ where }) => {
        sessions.delete(where.tokenHash);
      }
    },
    user: {
      findUnique: async ({ where }) => where.email === user.email ? { ...user } : null
    },
    auditLog: { create: async () => ({}) }
  };
}

function appFor(account) {
  return createApp({
    prisma: fakePrisma(account),
    allowedOrigins: ['http://localhost:5173'],
    production: false
  });
}

test('health endpoint is available without a database session', async () => {
  const response = await request(appFor({})).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, db: true });
});

test('health endpoint returns a safe database failure response and logs sanitized details', async () => {
  const failure = Object.assign(
    new Error('Can’t reach database server at `private.aiven.example:19115` using mysql://dbuser:dbpassword@private.aiven.example/defaultdb'),
    { code: 'P1001' }
  );
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const response = await request(createApp({
      prisma: { $queryRaw: async () => { throw failure; } },
      production: false
    })).get('/api/health');
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { ok: false, db: false, reason: 'connection_refused' });
    assert.equal(databaseFailureReason(failure), 'connection_refused');
    assert.equal(logs.length, 1);
    assert.match(logs[0], /P1001/);
    assert.doesNotMatch(logs[0], /private\.aiven\.example|dbpassword|dbuser|mysql:\/\//);
  } finally {
    console.error = originalError;
  }
});

test('database failure reasons use safe short codes', () => {
  assert.equal(databaseFailureReason({ code: 'P1000' }), 'access_denied');
  assert.equal(databaseFailureReason({ code: 'ETIMEDOUT' }), 'timeout');
  assert.equal(databaseFailureReason({ code: 'P1011' }), 'ssl_error');
  assert.equal(databaseFailureReason({ code: 'MISSING_ENV' }), 'missing_env');
  assert.equal(databaseFailureReason({ code: 'unrecognized' }), 'unknown');
});

test('startup validation reports only missing environment variable names', () => {
  assert.deepEqual(missingRequiredEnvironment({}), [
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'
  ]);
  assert.deepEqual(missingRequiredEnvironment({
    DATABASE_URL: 'mysql://dbuser:dbpassword@db.example.test/eindex'
  }), ['JWT_SECRET']);
});

test('local loopback Vite origin is allowed in development', async () => {
  const app = createApp({ prisma: fakePrisma({}), production: false });
  const response = await request(app)
    .get('/api/health')
    .set('Origin', 'http://127.0.0.1:5173');

  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
});

test('login creates an HttpOnly cookie and /me returns only safe account data', async () => {
  const app = appFor({
    id: 'teacher-1', email: 'teacher@example.test', passwordHash,
    fullName: 'Test Teacher', role: 'TEACHER', status: 'APPROVED',
    department: 'Education', staffId: '234566'
  });
  const agent = request.agent(app);

  const login = await agent.post('/api/auth/login').send({
    email: 'TEACHER@example.test', password: 'Teacher123!', role: 'teacher'
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'teacher@example.test');
  assert.equal(login.body.user.role, 'teacher');
  assert.equal(login.body.user.passwordHash, undefined);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/i);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/i);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.fullName, 'Test Teacher');
});

test('pending accounts and role mismatches cannot start a session', async t => {
  await t.test('pending teacher', async () => {
    const app = appFor({
      id: 'pending-1', email: 'pending@example.test', passwordHash,
      fullName: 'Pending Teacher', role: 'TEACHER', status: 'PENDING',
      department: 'Education', staffId: null
    });
    const response = await request(app).post('/api/auth/login').send({
      email: 'pending@example.test', password: 'Teacher123!', role: 'teacher'
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'ACCOUNT_PENDING');
    assert.equal(response.headers['set-cookie'], undefined);
  });

  await t.test('wrong portal role', async () => {
    const app = appFor({
      id: 'teacher-1', email: 'teacher@example.test', passwordHash,
      fullName: 'Test Teacher', role: 'TEACHER', status: 'APPROVED',
      department: 'Education', staffId: '234566'
    });
    const response = await request(app).post('/api/auth/login').send({
      email: 'teacher@example.test', password: 'Teacher123!', role: 'admin'
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'ROLE_MISMATCH');
  });
});

test('invalid credentials return a generic authentication error', async () => {
  const app = appFor({
    id: 'teacher-1', email: 'teacher@example.test', passwordHash,
    fullName: 'Test Teacher', role: 'TEACHER', status: 'APPROVED',
    department: 'Education', staffId: '234566'
  });
  const response = await request(app).post('/api/auth/login').send({
    email: 'teacher@example.test', password: 'wrong-password', role: 'teacher'
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('logout removes the persisted session and expires the cookie', async () => {
  const app = appFor({
    id: 'teacher-1', email: 'teacher@example.test', passwordHash,
    fullName: 'Test Teacher', role: 'TEACHER', status: 'APPROVED',
    department: 'Education', staffId: '234566'
  });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'teacher@example.test', password: 'Teacher123!', role: 'teacher'
  });

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 204);
  assert.match(logout.headers['set-cookie'][0], /Expires=/i);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});
