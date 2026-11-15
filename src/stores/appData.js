import { writable } from 'svelte/store';

const emptyData = () => ({
  teachers: [],
  students: [],
  classes: [],
  attendance: [],
  grades: [],
  registrations: [],
  audit: [],
  notifications: [],
  settings: {}
});

export const appData = writable(emptyData());

export function setAppData(data) {
  appData.set({ ...emptyData(), ...data });
}

export function clearAppData() {
  appData.set(emptyData());
}
