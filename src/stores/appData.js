import { writable } from 'svelte/store';

const STORAGE_KEY = 'e-index-demo-data-v1';
export const storageError = writable('');

const initialData = {
  accounts: [
    { email: 'admin@gmail.com', password: 'Admin123!', role: 'admin', name: 'Teacher Admin', active: true },
    { email: 'jinkysuson09@gmail.com', password: 'Teacher123!', role: 'teacher', name: 'Jinky Suson', teacherId: '234566', active: true }
  ],
  teachers: [
    { id: '234566', name: 'Jinky Suson', department: 'Computer Studies', email: 'jinkysuson09@gmail.com', role: 'Teacher', status: 'Approved', active: true, registered: 'Nov 9, 2026', last: 'Nov 9, 2026' }
  ],
  students: [
    { id: '2024-0001', name: 'Dela Cruz, Maria Angela', program: 'Comp Sci', year: '2nd Year', status: 'Active', rfid: 'RFID-0001', section: 'LAB 1', className: 'Comp 111 - 2nd Year' },
    { id: '2024-0002', name: 'Santos, John Patrick', program: 'Comp Sci', year: '2nd Year', status: 'Active', rfid: 'RFID-0002', section: 'LAB 1', className: 'Comp 111 - 2nd Year' },
    { id: '2024-0003', name: 'Reyes, Angelica', program: 'IT', year: '2nd Year', status: 'Active', rfid: 'RFID-0003', section: 'LAB 2', className: 'IT 210' },
    { id: '2024-0004', name: 'Garcia, Mark Anthony', program: 'Comp Sci', year: '2nd Year', status: 'Active', rfid: 'RFID-0004', section: 'LAB 1', className: 'Comp 111 - 2nd Year' }
  ],
  classes: [
    { name: 'Comp 111 - 2nd Year', sections: 3, course: 'Comp 111', year: '2nd Year', schedule: 'MWF 8:00–9:00 AM', sectionNames: ['LAB 1', 'LAB 2', 'LAB 3'] },
    { name: 'IT 210', sections: 2, course: 'IT 210', year: '2nd Year', schedule: 'TTh 1:00–3:00 PM', sectionNames: ['LAB 1', 'LAB 2'] },
    { name: 'MATH 101', sections: 1, course: 'MATH 101', year: '1st Year', schedule: 'F 9:00–10:00 AM', sectionNames: ['ROOM 1'] }
  ],
  attendance: [
    { id: '2024-0001', name: 'Dela Cruz, Maria Angela', className: 'Comp 111 - 2nd Year', section: 'LAB 1', date: '2026-11-14', status: 'Present', time: '08:05 AM', remarks: '', rfid: 'RFID-0001' },
    { id: '2024-0002', name: 'Santos, John Patrick', className: 'Comp 111 - 2nd Year', section: 'LAB 1', date: '2026-11-14', status: 'Present', time: '08:08 AM', remarks: '', rfid: 'RFID-0002' },
    { id: '2024-0003', name: 'Reyes, Angelica', className: 'IT 210', section: 'LAB 2', date: '2026-11-14', status: 'Late', time: '08:22 AM', remarks: 'Traffic', rfid: 'RFID-0003' },
    { id: '2024-0004', name: 'Garcia, Mark Anthony', className: 'Comp 111 - 2nd Year', section: 'LAB 1', date: '2026-11-14', status: 'Absent', time: '—', remarks: '', rfid: 'RFID-0004' }
  ],
  grades: [
    { studentId: '2024-0001', className: 'Comp 111 - 2nd Year', section: 'LAB 1', period: '1st Semester', quizzes: 90, examinations: 88, activities: 94, assessments: 91 },
    { studentId: '2024-0002', className: 'Comp 111 - 2nd Year', section: 'LAB 1', period: '1st Semester', quizzes: 84, examinations: 86, activities: 89, assessments: 87 },
    { studentId: '2024-0003', className: 'IT 210', section: 'LAB 2', period: '1st Semester', quizzes: 93, examinations: 91, activities: 88, assessments: 92 },
    { studentId: '2024-0004', className: 'Comp 111 - 2nd Year', section: 'LAB 1', period: '1st Semester', quizzes: 79, examinations: 83, activities: 85, assessments: 82 }
  ],
  registrations: [
    { id: 'registration-1', name: 'Taylor Morgan', email: 'taylor.morgan@essu.edu.ph', department: 'Education', password: 'Teacher123!', submitted: 'Nov 14, 2026', status: 'Pending' }
  ],
  audit: [
    { type: 'LOGIN', action: 'System', detail: 'Admin logged in', target: '—', time: 'Nov 9, 2026, 5:45 PM' }
  ],
  notifications: [
    { id: 'notification-1', title: 'Teacher registration pending', detail: 'Taylor Morgan requested teacher access.', read: false, role: 'admin' },
    { id: 'notification-2', title: 'Welcome to E-Index', detail: 'Your teacher workspace is ready.', read: false, role: 'teacher' }
  ],
  settings: {
    admin: { firstName: 'Teacher', lastName: 'Admin', email: 'admin@gmail.com', department: 'Administration', photo: '', notifications: { updates: true, attendance: true, announcements: true }, appearance: 'Light' },
    teacher: { firstName: 'Jinky', lastName: 'Suson', email: 'jinkysuson09@gmail.com', department: 'Computer Studies', photo: '', notifications: { updates: true, attendance: true, announcements: true }, appearance: 'Light' }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadData() {
  if (typeof localStorage === 'undefined') return clone(initialData);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(initialData);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...clone(initialData),
      ...parsed,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : clone(initialData.accounts),
      teachers: Array.isArray(parsed.teachers) ? parsed.teachers : clone(initialData.teachers),
      students: Array.isArray(parsed.students) ? parsed.students : clone(initialData.students),
      classes: Array.isArray(parsed.classes) ? parsed.classes : clone(initialData.classes),
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : clone(initialData.attendance),
      grades: Array.isArray(parsed.grades) ? parsed.grades : clone(initialData.grades),
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : clone(initialData.registrations),
      audit: Array.isArray(parsed.audit) ? parsed.audit : clone(initialData.audit),
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : clone(initialData.notifications),
      settings: parsed.settings || clone(initialData.settings)
    };
  } catch (error) {
    console.error('Unable to read saved E-Index demo data. Defaults are being used.', error);
    return clone(initialData);
  }
}

export const appData = writable(loadData());

appData.subscribe(data => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    storageError.set('');
  } catch (error) {
    console.error('Unable to save E-Index demo data to local storage.', error);
    storageError.set('Local demo data could not be saved. Check browser storage availability or space.');
  }
});

export function updateData(updater) {
  appData.update(data => {
    const next = updater(data);
    return next || data;
  });
}

export function resetDemoData() {
  appData.set(clone(initialData));
}
