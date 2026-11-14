const routesByRole = {
  admin: {
    Dashboard: '/admin/dashboard',
    Teachers: '/admin/teachers',
    Students: '/admin/students',
    'Pending Approvals': '/admin/approvals',
    'Audit Log': '/admin/audit-log',
    Settings: '/admin/settings'
  },
  teacher: {
    Dashboard: '/teacher/dashboard',
    'Attendance & RFID': '/teacher/attendance',
    Students: '/teacher/students',
    'Classes & Sections': '/teacher/classes',
    Reports: '/teacher/reports',
    Settings: '/teacher/settings'
  }
};

const routeEntries = Object.entries(routesByRole).flatMap(([role, pages]) =>
  Object.entries(pages).map(([page, path]) => ({ role, page, path }))
);

export function pathForPage(role, page) {
  return routesByRole[role]?.[page] || null;
}

export function resolvePortalRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return routeEntries.find(route => route.path === normalizedPath) || null;
}

export function dashboardPath(role) {
  return pathForPage(role, 'Dashboard');
}
