import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateDemoMode, createDemoData, deactivateDemoMode, DEMO_API_UNHANDLED,
  getDemoModeRole, handleDemoApiRequest
} from '../src/stores/demoData.js';
import { apiRequest } from '../src/utils/api.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    keys() {
      return [...values.keys()];
    }
  };
}

test('admin demo records match the requested dashboard totals and relationships', () => {
  const data = createDemoData('admin');

  assert.equal(data.teachers.length, 25);
  assert.equal(data.students.length, 480);
  assert.equal(data.teachers.length + data.students.length + 1, 506);
  assert.equal(data.classes.length, 32);
  assert.equal(data.colleges.length, 9);
  assert.equal(data.colleges.filter(college => college.isActive).length, 8);
  assert.equal(data.registrations.filter(registration => registration.status === 'Pending').length, 3);
  assert.equal(data.teachers.filter(teacher => teacher.status === 'Approved').length
    + data.teachers.filter(teacher => teacher.status === 'Pending').length
    + data.teachers.filter(teacher => teacher.status === 'Inactive').length
    + data.teachers.filter(teacher => teacher.status === 'Rejected').length, 25);
  assert.equal(data.teachers.every(teacher => data.colleges.some(college =>
    college.id === teacher.collegeId && college.name === teacher.collegeName)), true);
  assert.equal(data.students.every(student => data.classes.some(classItem =>
    classItem.id === student.sectionId && classItem.name === student.className)), true);
  assert.equal(data.attendance.length, 400);
  assert.equal(data.attendance.filter(record => record.status === 'Present').length, 368);
  assert.equal(data.grades.length, 0);
  assert.equal(data.teachers.every(teacher => teacher.email.endsWith('.invalid')), true);
  assert.equal(Object.hasOwn(data, 'users'), false);
});

test('teacher demo includes the five requested classes and matching academic samples', () => {
  const data = createDemoData('teacher');

  assert.deepEqual(data.classes.map(classItem => classItem.name), [
    'Computer Programming 101',
    'Database Systems',
    'Web Development',
    'Human Computer Interaction',
    'Information Management'
  ]);
  assert.equal(data.students.length, 120);
  assert.equal(data.attendance.length, 100);
  assert.equal(data.attendance.filter(record => record.status === 'Present').length, 92);
  assert.equal(data.grades.length, 120);
  assert.equal(data.upcomingExams.length, 3);
  assert.equal(data.announcements.length, 3);
  assert.equal(data.gradingTasks.length, 2);
  assert.equal(data.gradingTasks.every(task => data.classes.some(classItem => classItem.name === task.className)), true);
});

test('demo interception does not claim auth requests when no browser demo is active', () => {
  const previousWindow = globalThis.window;
  try {
    delete globalThis.window;
    assert.equal(handleDemoApiRequest('/api/auth/colleges'), DEMO_API_UNHANDLED);
    assert.equal(handleDemoApiRequest('/api/auth/login', { method: 'POST' }), DEMO_API_UNHANDLED);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('demo API edits remain in browser storage and exiting preserves unrelated local data', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const storage = createMemoryStorage({ 'unrelated-app-setting': 'preserve-me' });
  let fetchCalls = 0;
  globalThis.window = { localStorage: storage };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('Demo requests must not reach the API.');
  };

  try {
    activateDemoMode('admin');
    assert.equal(getDemoModeRole(), 'admin');
    const data = await apiRequest('/api/data');
    assert.equal(data.isDemoData, true);
    assert.equal(data.teachers.length, 25);

    const decision = await apiRequest('/api/data/registrations/DEMO-REGISTRATION-1', {
      method: 'PATCH',
      body: { status: 'APPROVED' }
    });
    assert.equal(decision.emailNotification, 'not-sent-demo');
    assert.equal((await apiRequest('/api/data')).registrations[0].status, 'Approved');

    await apiRequest('/api/data/teachers', {
      method: 'POST',
      body: {
        fullName: 'Demo New Teacher',
        staffId: '969001',
        collegeId: 'DEMO-COLLEGE-CCS',
        email: 'new.teacher@example.invalid',
        status: 'APPROVED'
      }
    });
    await apiRequest('/api/data/profile', {
      method: 'PATCH',
      body: {
        fullName: 'Demo Administrator',
        email: 'demo.admin@example.invalid',
        department: 'Administration',
        photo: ''
      }
    });
    await apiRequest('/api/data/colleges/DEMO-COLLEGE-COT/activate', {
      method: 'POST',
      body: {
        officialNameConfirmed: true,
        guiuanCampusAssignmentConfirmed: true,
        confirmationReference: 'DEMO-REFERENCE-01'
      }
    });
    const updatedData = await apiRequest('/api/data');
    assert.equal(updatedData.teachers.length, 26);
    assert.equal(updatedData.teachers.some(teacher => teacher.id === '969001' && teacher.demoRecord), true);
    assert.equal(updatedData.colleges.find(college => college.code === 'COT').isActive, true);
    assert.equal(fetchCalls, 0);
    assert.equal(handleDemoApiRequest('/api/auth/login', { method: 'POST' }), DEMO_API_UNHANDLED);

    deactivateDemoMode();
    assert.equal(getDemoModeRole(), null);
    assert.deepEqual(storage.keys(), ['unrelated-app-setting']);
    assert.equal(storage.getItem('unrelated-app-setting'), 'preserve-me');
  } finally {
    deactivateDemoMode();
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
