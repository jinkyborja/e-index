import { writable } from 'svelte/store';

const emptyData = () => ({
  teachers: [],
  students: [],
  classes: [],
  attendance: [],
  grades: [],
  registrations: [],
  colleges: [],
  audit: [],
  notifications: [],
  settings: {},
  upcomingExams: [],
  announcements: [],
  gradingTasks: [],
  isDemoData: false,
  demoRole: null
});

export const appData = writable(emptyData());

export function setAppData(data) {
  appData.set({ ...emptyData(), ...data });
}

export function clearAppData() {
  appData.set(emptyData());
}
