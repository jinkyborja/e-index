import { TEACHER_COLLEGES } from '../../shared/teacher-colleges.js';

const DEMO_MODE_KEY = 'eindex-demo-mode-v1';
const DEMO_DATA_PREFIX = 'eindex-demo-data-v1';
export const DEMO_API_UNHANDLED = Symbol('demo-api-unhandled');
let localIdSequence = 0;

const firstNames = [
  'Aira', 'Ana', 'Andres', 'Angela', 'Beatriz', 'Carlo', 'Camille', 'Daniel',
  'Emilio', 'Gabriel', 'Jasmine', 'Jose', 'Juan', 'Lorenzo', 'Luis', 'Maria',
  'Mark', 'Micaela', 'Miguel', 'Nicole', 'Paolo', 'Patricia', 'Rafael', 'Sofia'
];
const lastNames = [
  'Aguilar', 'Aquino', 'Bautista', 'Castillo', 'Cruz', 'Dela Cruz', 'Dizon',
  'Fernandez', 'Flores', 'Garcia', 'Gonzales', 'Herrera', 'Lim', 'Mendoza',
  'Morales', 'Navarro', 'Ramos', 'Reyes', 'Rivera', 'Santos'
];

const namedTeachers = [
  { name: 'Maria Santos', college: 'CCS', status: 'Approved' },
  { name: 'Juan Dela Cruz', college: 'CBMA', status: 'Approved' },
  { name: 'Ana Reyes', college: 'CON', status: 'Pending' },
  { name: 'Mark Garcia', college: 'COE', status: 'Approved' },
  { name: 'Sofia Mendoza', college: 'COED', status: 'Pending' },
  { name: 'Paolo Lim', college: 'CCJE', status: 'Pending' },
  { name: 'Jose Villanueva', college: 'CAS', status: 'Approved' },
  { name: 'Carla Bautista', college: 'CHM', status: 'Approved' },
  { name: 'Miguel Ramos', college: 'CCS', status: 'Approved' },
  { name: 'Liza Navarro', college: 'CBMA', status: 'Approved' },
  { name: 'Angelo Flores', college: 'CON', status: 'Approved' },
  { name: 'Beatriz Aquino', college: 'COE', status: 'Approved' },
  { name: 'Carlo Fernandez', college: 'COED', status: 'Approved' },
  { name: 'Patricia Morales', college: 'CAS', status: 'Approved' },
  { name: 'Daniel Castillo', college: 'CHM', status: 'Approved' },
  { name: 'Camille Torres', college: 'CCS', status: 'Approved' },
  { name: 'Rafael Rivera', college: 'CBMA', status: 'Approved' },
  { name: 'Jasmine Cruz', college: 'CON', status: 'Approved' },
  { name: 'Gabriel Mendoza', college: 'COE', status: 'Approved' },
  { name: 'Abigail Gonzales', college: 'COED', status: 'Approved' },
  { name: 'Emilio Dizon', college: 'CAS', status: 'Approved' },
  { name: 'Nicole Herrera', college: 'CHM', status: 'Approved' },
  { name: 'Teresa Salazar', college: 'COT', status: 'Inactive' },
  { name: 'Victor Mercado', college: 'COT', status: 'Inactive' },
  { name: 'Josephine Navarro', college: 'CCJE', status: 'Rejected' }
];

const additionalCourses = [
  ['Discrete Mathematics', 'BSCS'],
  ['Data Structures and Algorithms', 'BSCS'],
  ['Object-Oriented Programming', 'BSCS'],
  ['Software Engineering', 'BSCS'],
  ['Computer Networks', 'BSCS'],
  ['Operating Systems', 'BSCS'],
  ['Statistics for Business', 'BSBA'],
  ['Financial Accounting', 'BSBA'],
  ['Principles of Marketing', 'BSBA'],
  ['Business Communication', 'BSBA'],
  ['Nursing Fundamentals', 'BSN'],
  ['Community Health Nursing', 'BSN'],
  ['Medical-Surgical Nursing', 'BSN'],
  ['Health Assessment', 'BSN'],
  ['Engineering Mathematics', 'BSCE'],
  ['Statics and Dynamics', 'BSCE'],
  ['Electrical Circuits', 'BSCE'],
  ['Curriculum Development', 'BEEd'],
  ['Assessment of Learning', 'BEEd'],
  ['Teaching Strategies', 'BEEd'],
  ['Criminal Law', 'BSCrim'],
  ['Forensic Science', 'BSCrim'],
  ['Tourism Operations', 'BSHM'],
  ['Food and Beverage Service', 'BSHM'],
  ['General Biology', 'BSAS'],
  ['Research Methods', 'BSAS'],
  ['Information Assurance', 'BSCS']
];

const yearLabels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const scheduleSlots = [
  'M 8:00 AM - 10:00 AM',
  'T 10:00 AM - 12:00 PM',
  'W 1:00 PM - 3:00 PM',
  'Th 8:00 AM - 10:00 AM',
  'F 1:00 PM - 3:00 PM',
  'Sa 9:00 AM - 11:00 AM'
];
const attendanceDates = ['2026-11-15', '2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextLocalId(prefix) {
  localIdSequence += 1;
  return `${prefix}-${Date.now()}-${localIdSequence}`;
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Demo data requires browser local storage.');
  }
  return window.localStorage;
}

function dataStorageKey(role) {
  return `${DEMO_DATA_PREFIX}:${role}`;
}

function readStoredData(role) {
  const raw = getStorage().getItem(dataStorageKey(role));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('The saved demo data is invalid. Reset the demo data to continue.');
  }
}

function writeStoredData(role, data) {
  getStorage().setItem(dataStorageKey(role), JSON.stringify(data));
}

function activeRole() {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (!storage) return null;
    const role = storage.getItem(DEMO_MODE_KEY);
    return role === 'admin' || role === 'teacher' ? role : null;
  } catch (error) {
    if (error?.name === 'SecurityError') return null;
    throw error;
  }
}

function ensureDemoRole(role) {
  if (role !== 'admin' && role !== 'teacher') {
    throw new Error('A valid portal role is required for demo data.');
  }
}

function classDefinitions() {
  const firstFive = [
    { name: 'Computer Programming 101', program: 'BSCS', year: '1st Year', section: 'BSCS Section A', schedule: 'M 8:00 AM - 10:00 AM' },
    { name: 'Database Systems', program: 'BSCS', year: '2nd Year', section: 'BSCS Section A', schedule: 'T 10:00 AM - 12:00 PM' },
    { name: 'Web Development', program: 'BSCS', year: '2nd Year', section: 'BSCS Section B', schedule: 'W 1:00 PM - 3:00 PM' },
    { name: 'Human Computer Interaction', program: 'BSCS', year: '3rd Year', section: 'BSCS Section A', schedule: 'Th 8:00 AM - 10:00 AM' },
    { name: 'Information Management', program: 'BSCS', year: '3rd Year', section: 'BSCS Section B', schedule: 'F 1:00 PM - 3:00 PM' }
  ];
  return [...firstFive, ...additionalCourses.map(([name, program], index) => {
    const section = `${program} Section ${index % 2 ? 'B' : 'A'}`;
    return {
      name,
      program,
      year: yearLabels[index % yearLabels.length],
      section,
      schedule: scheduleSlots[(index + 2) % scheduleSlots.length]
    };
  })].map((item, index) => ({
    ...item,
    id: `DEMO-CLASS-${String(index + 1).padStart(2, '0')}`,
    course: item.name,
    sections: 1,
    sectionNames: [item.section],
    active: true,
    demoRecord: true
  }));
}

function makeTeachers(colleges) {
  const collegeMap = new Map(colleges.map(college => [college.code, college]));
  return namedTeachers.map((teacher, index) => {
    const college = collegeMap.get(teacher.college);
    const staffId = String(950001 + index);
    return {
      id: staffId,
      accountId: `demo-account-${String(index + 1).padStart(3, '0')}`,
      name: teacher.name,
      department: college.name,
      collegeId: college.id,
      collegeName: college.name,
      collegeCode: college.code,
      collegeIsActive: college.isActive,
      email: `teacher.${String(index + 1).padStart(2, '0')}@example.invalid`,
      role: 'Teacher',
      status: teacher.status,
      active: teacher.status === 'Approved',
      registered: `Oct ${String((index % 28) + 1).padStart(2, '0')}, 2026`,
      last: teacher.status === 'Approved' ? 'Nov 14, 2026' : '—',
      demoRecord: true
    };
  });
}

function makeStudents(classes) {
  return Array.from({ length: 480 }, (_, index) => {
    const classIndex = index < 120
      ? Math.floor(index / 24)
      : 5 + Math.floor(((index - 120) * 27) / 360);
    const classItem = classes[classIndex];
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length)];
    const number = String(index + 1).padStart(4, '0');
    return {
      id: `D-2026-${number}`,
      name: `${firstName} ${lastName}`,
      program: classItem.program,
      year: classItem.year,
      status: 'Active',
      rfid: `DEMO-RFID-${number}`,
      sectionId: classItem.id,
      section: classItem.section,
      className: classItem.name,
      demoRecord: true
    };
  });
}

function makeAttendance(students, count) {
  const statuses = Array.from({ length: 100 }, (_, index) => {
    if (index < 92) return 'Present';
    if (index < 96) return 'Late';
    if (index < 98) return 'Absent';
    return 'Excused';
  });
  return students.slice(0, count).map((student, index) => ({
    id: student.id,
    attendanceId: `DEMO-ATTENDANCE-${String(index + 1).padStart(4, '0')}`,
    studentId: student.id,
    sectionId: student.sectionId,
    name: student.name,
    className: student.className,
    section: student.section,
    date: attendanceDates[index % attendanceDates.length],
    status: statuses[index % statuses.length],
    time: `${String(8 + (index % 4)).padStart(2, '0')}:${index % 2 ? '30' : '00'} AM`,
    remarks: statuses[index % statuses.length] === 'Present' ? '' : 'Demo attendance record',
    rfid: student.rfid,
    demoRecord: true
  }));
}

function makeGrades(students) {
  return students.map((student, index) => ({
    studentId: student.id,
    className: student.className,
    section: student.section,
    period: 'Midterm',
    quizzes: 74 + (index % 25),
    examinations: 72 + ((index * 3) % 28),
    activities: 78 + ((index * 5) % 22),
    assessments: 76 + ((index * 7) % 24),
    demoRecord: true
  }));
}

function makeAudit() {
  const entries = [
    ['REGISTRATION', 'Registration reviewed', 'Reviewed a teacher access request.', 'Sofia Mendoza', 'Demo Administrator'],
    ['COLLEGE', 'College activated', 'Confirmed a college choice for demonstration.', 'College of Computer Studies (CCS)', 'Demo Administrator'],
    ['ACCOUNT', 'Teacher status changed', 'Updated a teacher account status.', 'Demo staff ID 950004', 'Demo Administrator'],
    ['ATTENDANCE', 'Attendance recorded', 'Recorded class attendance.', 'Computer Programming 101 · BSCS Section A', 'Maria Santos'],
    ['GRADE', 'Grades updated', 'Updated midterm grading records.', 'Database Systems · BSCS Section A', 'Maria Santos'],
    ['PROFILE', 'Profile updated', 'Updated account profile details.', 'Demo administrator profile', 'Demo Administrator'],
    ['REGISTRATION', 'Registration reviewed', 'Reviewed a teacher access request.', 'Paolo Lim', 'Demo Administrator'],
    ['ATTENDANCE', 'Attendance reviewed', 'Reviewed attendance entries.', 'Web Development · BSCS Section B', 'Maria Santos']
  ];
  return entries.map(([type, action, detail, target, actor], index) => ({
    id: `DEMO-AUDIT-${index + 1}`,
    type,
    action,
    detail,
    target,
    actor,
    time: new Date(Date.UTC(2026, 10, 14 - index, 15 - (index % 5), 10)).toISOString(),
    demoRecord: true
  }));
}

function makeUpcomingExams() {
  return [
    { id: 'DEMO-EXAM-01', title: 'Midterm Examination', className: 'Database Systems', section: 'BSCS Section A', date: 'Nov 20, 2026', time: '9:00 AM - 11:00 AM', venue: 'Computer Laboratory 2', demoRecord: true },
    { id: 'DEMO-EXAM-02', title: 'Practical Examination', className: 'Web Development', section: 'BSCS Section B', date: 'Nov 23, 2026', time: '1:00 PM - 3:00 PM', venue: 'Computer Laboratory 1', demoRecord: true },
    { id: 'DEMO-EXAM-03', title: 'Written Examination', className: 'Computer Programming 101', section: 'BSCS Section A', date: 'Nov 26, 2026', time: '8:00 AM - 10:00 AM', venue: 'Room 204', demoRecord: true }
  ];
}

function makeAnnouncements() {
  return [
    { id: 'DEMO-ANNOUNCEMENT-01', title: 'Final examination schedule', detail: 'The AY 2026–2027 examination schedule is now available for review.', date: 'Nov 14, 2026', demoRecord: true },
    { id: 'DEMO-ANNOUNCEMENT-02', title: 'Faculty development session', detail: 'A faculty development session is scheduled for November 27 at Guiuan Campus.', date: 'Nov 12, 2026', demoRecord: true },
    { id: 'DEMO-ANNOUNCEMENT-03', title: 'Midterm grade submission', detail: 'Please submit midterm grades by November 30, 2026.', date: 'Nov 10, 2026', demoRecord: true }
  ];
}

function makeGradingTasks() {
  return [
    { id: 'DEMO-TASK-01', title: 'Review midterm examination scores', className: 'Database Systems', section: 'BSCS Section A', dueDate: 'Nov 20, 2026', status: 'Pending', demoRecord: true },
    { id: 'DEMO-TASK-02', title: 'Finalize project activity grades', className: 'Web Development', section: 'BSCS Section B', dueDate: 'Nov 23, 2026', status: 'Pending', demoRecord: true }
  ];
}

function makeNotifications(role) {
  const records = role === 'admin'
    ? [
      ['Three teacher registrations need review', 'Review the pending requests in Pending Approvals.'],
      ['College choices are ready', 'Eight colleges are active in this local demo dataset.']
    ]
    : [
      ['Midterm grading tasks are due soon', 'Two grading tasks are awaiting your review.'],
      ['Examination schedule updated', 'Upcoming examinations are listed on your dashboard.']
    ];
  return records.map(([title, detail], index) => ({
    id: `DEMO-NOTIFICATION-${role}-${index + 1}`,
    title,
    detail,
    read: index > 0,
    role,
    time: new Date(Date.UTC(2026, 10, 14 - index, 14, 0)).toISOString(),
    demoRecord: true
  }));
}

export function createDemoData(role) {
  ensureDemoRole(role);
  const colleges = TEACHER_COLLEGES.map((college, index) => ({
    id: `DEMO-COLLEGE-${college.code}`,
    code: college.code,
    name: college.name,
    isActive: index < 8,
    demoRecord: true
  }));
  const allClasses = classDefinitions();
  const allStudents = makeStudents(allClasses);
  const allTeachers = makeTeachers(colleges);
  const registrations = allTeachers
    .filter(teacher => teacher.status === 'Pending')
    .map((teacher, index) => ({
      id: `DEMO-REGISTRATION-${index + 1}`,
      accountId: teacher.accountId,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      collegeId: teacher.collegeId,
      collegeName: teacher.collegeName,
      collegeCode: teacher.collegeCode,
      collegeIsActive: teacher.collegeIsActive,
      submitted: `Nov ${String(12 - index).padStart(2, '0')}, 2026`,
      status: 'Pending',
      demoRecord: true
    }));
  const isAdmin = role === 'admin';
  const classes = isAdmin ? allClasses : allClasses.slice(0, 5);
  const students = isAdmin ? allStudents : allStudents.slice(0, 120);
  const attendance = makeAttendance(students, isAdmin ? 400 : 100);
  const settings = {
    admin: {
      firstName: 'Demo',
      lastName: 'Administrator',
      email: 'demo.admin@example.invalid',
      department: 'Administration',
      photo: '',
      notifications: { updates: true, attendance: true, announcements: true },
      appearance: 'Light'
    },
    'teacher:demo': {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@example.invalid',
      department: 'College of Computer Studies (CCS)',
      collegeId: 'DEMO-COLLEGE-CCS',
      collegeName: 'College of Computer Studies (CCS)',
      collegeIsActive: true,
      photo: '',
      notifications: { updates: true, attendance: true, announcements: true },
      appearance: 'Light'
    }
  };
  return {
    isDemoData: true,
    demoRole: role,
    teachers: isAdmin ? allTeachers : [],
    students,
    classes,
    attendance,
    grades: isAdmin ? [] : makeGrades(students),
    registrations: isAdmin ? registrations : [],
    colleges,
    audit: isAdmin ? makeAudit() : [],
    notifications: makeNotifications(role),
    settings,
    upcomingExams: isAdmin ? [] : makeUpcomingExams(),
    announcements: makeAnnouncements(),
    gradingTasks: isAdmin ? [] : makeGradingTasks()
  };
}

export function isDemoModeActive() {
  return activeRole() !== null;
}

export function getDemoModeRole() {
  return activeRole();
}

export function activateDemoMode(role, reset = false) {
  ensureDemoRole(role);
  const storage = getStorage();
  let data = reset ? null : readStoredData(role);
  if (!data) {
    data = createDemoData(role);
    writeStoredData(role, data);
  }
  storage.setItem(DEMO_MODE_KEY, role);
  return clone(data);
}

export function deactivateDemoMode() {
  const storage = getStorage();
  storage.removeItem(dataStorageKey('admin'));
  storage.removeItem(dataStorageKey('teacher'));
  storage.removeItem(DEMO_MODE_KEY);
}

function demoError(message, code = 'DEMO_ACTION_ERROR') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function roleSettingsKey(role) {
  return role === 'admin' ? 'admin' : 'teacher:demo';
}

function addAudit(data, role, action, detail, target) {
  data.audit.unshift({
    id: nextLocalId('DEMO-AUDIT'),
    type: 'DEMO',
    action,
    detail,
    target,
    actor: role === 'admin' ? 'Demo Administrator' : 'Maria Santos',
    time: new Date().toISOString(),
    demoRecord: true
  });
}

function registrationDecision(data, role, id, body) {
  if (role !== 'admin') throw demoError('Only the demo administrator can review registrations.', 'FORBIDDEN');
  const registration = data.registrations.find(item => item.id === id);
  if (!registration || registration.status !== 'Pending') {
    throw demoError('This demo registration is no longer pending.', 'NOT_FOUND');
  }
  if (!['APPROVED', 'REJECTED'].includes(body?.status)) {
    throw demoError('Choose an approved or rejected status.', 'VALIDATION_ERROR');
  }
  registration.status = body.status === 'APPROVED' ? 'Approved' : 'Rejected';
  const teacher = data.teachers.find(item => item.accountId === registration.accountId);
  if (teacher) {
    teacher.status = registration.status;
    teacher.active = registration.status === 'Approved';
  }
  addAudit(data, role, 'Registration decision', `Marked a demo registration ${registration.status.toLowerCase()}.`, registration.name);
  data.notifications.unshift({
    id: nextLocalId('DEMO-NOTIFICATION'),
    title: `Demo registration ${registration.status.toLowerCase()}`,
    detail: `${registration.name}'s sample access request was updated locally. No email was sent.`,
    read: false,
    role: 'admin',
    time: new Date().toISOString(),
    demoRecord: true
  });
  return { saved: true, emailNotification: 'not-sent-demo' };
}

function updateTeacher(data, role, identifier, body, isNew = false) {
  if (role !== 'admin') throw demoError('Only the demo administrator can manage teacher accounts.', 'FORBIDDEN');
  const college = data.colleges.find(item => item.id === body.collegeId);
  const current = data.teachers.find(item => item.accountId === identifier || item.id === identifier);
  if (!college || (!college.isActive && (!current || college.id !== current.collegeId))) {
    throw demoError('Select an active college for this demo teacher.', 'VALIDATION_ERROR');
  }
  const name = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const staffId = String(body.staffId || '').trim();
  const status = String(body.status || '').toUpperCase();
  if (!name || !/^\d+$/.test(staffId) || !/^[^\s@]+@[^\s@]+\.invalid$/i.test(email) || !['APPROVED', 'PENDING'].includes(status)) {
    throw demoError('Use a name, numeric staff ID, demo email, college, and valid account status.', 'VALIDATION_ERROR');
  }
  if (data.teachers.some(item => item.email.toLowerCase() === email && item.accountId !== identifier)
    || data.teachers.some(item => item.id === staffId && item.accountId !== identifier)) {
    throw demoError('That demo email or staff ID is already in use.', 'CONFLICT');
  }
  const record = isNew
    ? { id: staffId, accountId: nextLocalId('demo-account') }
    : data.teachers.find(item => item.accountId === identifier || item.id === identifier);
  if (!record) throw demoError('The demo teacher account could not be found.', 'NOT_FOUND');
  Object.assign(record, {
    id: staffId,
    name,
    email,
    department: college.name,
    collegeId: college.id,
    collegeName: college.name,
    collegeCode: college.code,
    collegeIsActive: college.isActive,
    role: 'Teacher',
    status: status === 'APPROVED' ? 'Approved' : 'Pending',
    active: status === 'APPROVED',
    demoRecord: true
  });
  if (isNew) {
    record.registered = 'Nov 15, 2026';
    record.last = '—';
    data.teachers.unshift(record);
  }
  addAudit(data, role, 'Teacher account saved', `Saved a demo teacher account (${record.status.toLowerCase()}).`, name);
  return { saved: true };
}

function handleDemoDataRequest(path, method, body, role) {
  const data = readStoredData(role);
  if (!data) throw demoError('Demo data is unavailable. Reset the demo dataset to continue.');
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (path === '/api/data' && method === 'GET') return clone(data);
  if (path === '/api/data/profile' && method === 'PATCH') {
    const settings = data.settings[roleSettingsKey(role)];
    const fullName = String(body?.fullName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!fullName || !/^[^\s@]+@[^\s@]+\.invalid$/i.test(email)) {
      throw demoError('Use a name and a fictional .invalid email address for the local demo profile.', 'VALIDATION_ERROR');
    }
    if (body.photo && String(body.photo).length > 3_500_000) {
      throw demoError('The demo profile photo is too large to save in browser storage.', 'STORAGE_LIMIT');
    }
    const college = body.collegeId ? data.colleges.find(item => item.id === body.collegeId) : null;
    if (role === 'teacher' && body.collegeId && !college) {
      throw demoError('Choose a college from the local demo list.', 'VALIDATION_ERROR');
    }
    const [firstName, ...lastName] = fullName.split(/\s+/);
    Object.assign(settings, {
      firstName,
      lastName: lastName.join(' '),
      email,
      photo: String(body.photo || ''),
      ...(role === 'admin'
        ? { department: String(body.department || '').trim() }
        : {
          collegeId: college?.id || settings.collegeId,
          collegeName: college?.name || settings.collegeName,
          department: college?.name || settings.department,
          collegeIsActive: college?.isActive ?? settings.collegeIsActive
        })
    });
    writeStoredData(role, data);
    return { saved: true };
  }
  if (path === '/api/data/preferences' && method === 'PATCH') {
    const settings = data.settings[roleSettingsKey(role)];
    if (body?.notificationPreferences) settings.notifications = { ...body.notificationPreferences };
    if (body?.appearance) settings.appearance = body.appearance;
    writeStoredData(role, data);
    return { saved: true };
  }
  if (path === '/api/data/teachers' && method === 'POST') {
    const result = updateTeacher(data, role, null, body, true);
    writeStoredData(role, data);
    return result;
  }
  if (segments[2] === 'teachers' && segments.length === 4 && method === 'PATCH') {
    const result = updateTeacher(data, role, segments[3], body);
    writeStoredData(role, data);
    return result;
  }
  if (segments[2] === 'teachers' && segments[4] === 'status' && method === 'PATCH') {
    if (role !== 'admin') throw demoError('Only the demo administrator can manage teacher accounts.', 'FORBIDDEN');
    const teacher = data.teachers.find(item => item.accountId === segments[3] || item.id === segments[3]);
    if (!teacher) throw demoError('The demo teacher account could not be found.', 'NOT_FOUND');
    const status = String(body?.status || '').toUpperCase();
    if (!['APPROVED', 'INACTIVE'].includes(status)) throw demoError('Choose an approved or inactive status.', 'VALIDATION_ERROR');
    teacher.status = status === 'APPROVED' ? 'Approved' : 'Inactive';
    teacher.active = status === 'APPROVED';
    addAudit(data, role, 'Teacher status changed', `Changed a demo teacher account to ${teacher.status.toLowerCase()}.`, teacher.name);
    writeStoredData(role, data);
    return { saved: true };
  }
  if (path === '/api/data/teacher-bulk-status' && method === 'PATCH') {
    if (role !== 'admin') throw demoError('Only the demo administrator can manage teacher accounts.', 'FORBIDDEN');
    const identifiers = new Set((body?.identifiers || []).map(String));
    const status = String(body?.status || '').toUpperCase();
    if (!['APPROVED', 'INACTIVE'].includes(status)) throw demoError('Choose an approved or inactive status.', 'VALIDATION_ERROR');
    data.teachers.filter(item => identifiers.has(item.accountId) || identifiers.has(item.id)).forEach(teacher => {
      teacher.status = status === 'APPROVED' ? 'Approved' : 'Inactive';
      teacher.active = status === 'APPROVED';
    });
    addAudit(data, role, 'Bulk teacher status updated', `Updated ${identifiers.size} demo teacher account(s).`, 'Teacher accounts');
    writeStoredData(role, data);
    return { saved: true };
  }
  if (segments[2] === 'registrations' && segments.length === 4 && method === 'PATCH') {
    const result = registrationDecision(data, role, segments[3], body);
    writeStoredData(role, data);
    return result;
  }
  if (segments[2] === 'colleges' && segments.length === 5 && method === 'POST') {
    if (role !== 'admin') throw demoError('Only the demo administrator can manage colleges.', 'FORBIDDEN');
    const college = data.colleges.find(item => item.id === segments[3]);
    if (!college) throw demoError('The demo college could not be found.', 'NOT_FOUND');
    const action = segments[4];
    if (action === 'activate') {
      if (!body?.officialNameConfirmed || !body?.guiuanCampusAssignmentConfirmed || !String(body?.confirmationReference || '').trim()) {
        throw demoError('Complete both confirmations and provide a reference.', 'VALIDATION_ERROR');
      }
      college.isActive = true;
      addAudit(data, role, 'College activated', 'Activated a college in the local demo dataset.', college.name);
    } else if (action === 'deactivate') {
      college.isActive = false;
      addAudit(data, role, 'College deactivated', 'Deactivated a college in the local demo dataset.', college.name);
    } else {
      throw demoError('This college action is not available in demo mode.');
    }
    writeStoredData(role, data);
    return { saved: true };
  }
  if (path === '/api/data/attendance/scan' && method === 'POST') {
    if (role !== 'teacher') throw demoError('Only the demo teacher can record attendance.', 'FORBIDDEN');
    const student = data.students.find(item => item.id === body?.studentId);
    if (!student || student.sectionId !== body.sectionId) {
      throw demoError('The demo student is not assigned to that class section.', 'NOT_FOUND');
    }
    const existing = data.attendance.find(item => item.studentId === student.id && item.date === body.date);
    if (existing) {
      existing.status = 'Present';
      existing.time = body.time || existing.time;
    } else {
      data.attendance.unshift({
        id: student.id,
        attendanceId: nextLocalId('DEMO-ATTENDANCE'),
        studentId: student.id,
        sectionId: student.sectionId,
        name: student.name,
        className: student.className,
        section: student.section,
        date: body.date,
        status: 'Present',
        time: body.time || '—',
        remarks: '',
        rfid: student.rfid,
        demoRecord: true
      });
    }
    addAudit(data, role, 'Attendance recorded', 'Recorded a demo attendance entry.', student.name);
    writeStoredData(role, data);
    return { saved: true };
  }
  if (segments[2] === 'attendance' && segments.length === 4 && method === 'PATCH') {
    if (role !== 'teacher') throw demoError('Only the demo teacher can update attendance.', 'FORBIDDEN');
    const item = data.attendance.find(record => record.attendanceId === segments[3]);
    if (!item) throw demoError('The demo attendance record could not be found.', 'NOT_FOUND');
    if (body?.status) {
      const statuses = { PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', EXCUSED: 'Excused' };
      if (!statuses[body.status]) throw demoError('Choose a valid attendance status.', 'VALIDATION_ERROR');
      item.status = statuses[body.status];
    }
    if (body?.remarks !== undefined) item.remarks = String(body.remarks);
    addAudit(data, role, 'Attendance updated', `Updated a demo attendance record (${item.status.toLowerCase()}).`, item.name);
    writeStoredData(role, data);
    return { saved: true };
  }
  if (path === '/api/data/notifications/read-all' && method === 'PATCH') {
    data.notifications.filter(item => item.role === role).forEach(item => { item.read = true; });
    writeStoredData(role, data);
    return { saved: true };
  }
  if (segments[2] === 'notifications' && segments[4] === 'read' && method === 'PATCH') {
    const notification = data.notifications.find(item => item.id === segments[3] && item.role === role);
    if (!notification) throw demoError('The demo notification could not be found.', 'NOT_FOUND');
    notification.read = true;
    writeStoredData(role, data);
    return { saved: true };
  }

  throw demoError('This action is not available in local demo mode.');
}

export function handleDemoApiRequest(path, { method = 'GET', body } = {}) {
  const pathname = String(path).split('?')[0];
  const isDataRoute = pathname === '/api/data' || pathname.startsWith('/api/data/');
  const isCollegeChoicesRoute = pathname === '/api/auth/colleges';
  const isPasswordChangeRoute = pathname === '/api/auth/change-password';
  if (!isDataRoute && !isCollegeChoicesRoute && !isPasswordChangeRoute) return DEMO_API_UNHANDLED;
  const role = activeRole();
  if (!role) return DEMO_API_UNHANDLED;
  if (isPasswordChangeRoute) {
    throw demoError('Password changes are disabled in demo mode. Exit demo mode to update your real account.', 'DEMO_READ_ONLY');
  }
  if (isCollegeChoicesRoute && method === 'GET') {
    return readStoredData(role)?.colleges.filter(item => item.isActive).map(({ id, code, name }) => ({ id, code, name })) || [];
  }
  return handleDemoDataRequest(pathname, method, body, role);
}
