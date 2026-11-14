<script>
  import { onMount } from 'svelte';
  import { authUser, restoreAuth, signIn, signOut, updateAuthUser } from './stores/auth.js';
  import MiniStat from './components/MiniStat.svelte';
  import PageTitle from './components/PageTitle.svelte';
  import AdminDashboard from './components/AdminDashboard.svelte';
  import TeacherDashboard from './components/TeacherDashboard.svelte';
  import { get } from 'svelte/store';
  import { appData, storageError, updateData, resetDemoData } from './stores/appData.js';
  import { navigate, routeLocation, watchHistory } from './utils/router.js';
  import { dashboardPath, pathForPage, resolvePortalRoute } from './utils/routes.js';
  import { exportCsv } from './utils/export.js';
  import {
    LayoutDashboard, Users, GraduationCap, Clock3, ClipboardList, Activity,
    Settings, Search, Bell, ChevronDown, Menu, X, LogOut, PanelLeftClose,
    CalendarDays, Check, ArrowUpRight, ArrowRight, Plus, Download, MoreHorizontal,
    BookOpen, ScanLine, FileBarChart, UserRound, ShieldCheck,
    RefreshCw, Filter, Calendar, FileText, TrendingUp, Clock, CheckCircle2,
    XCircle, AlertCircle, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
    ClipboardCheck, Building2, Mail, Lock, Palette, SlidersHorizontal
  } from 'lucide-svelte';

  const storedAccount = restoreAuth();

  let portal = storedAccount?.role || 'auth';
  let currentUser = storedAccount;
  $: currentUser = $authUser;
  let teacherAuthenticated = storedAccount?.role === 'teacher';
  let authMode = 'login';
  let authRole = storedAccount?.role || 'teacher';
  let loginEmail = '';
  let signupName = '';
  let signupDepartment = '';
  let rememberMe = Boolean(storedAccount?.remember);
  let authError = '';
  let showPassword = false;
  let loginPassword = '';
  let signupPassword = '';
  let signupPasswordConfirm = '';
  let page = 'Dashboard';
  let sidebarOpen = false;
  let sidebarCollapsed = false;
  let searchText = '';
  let selectedTab = 'Attendance';
  let selectedClass = 'Comp 111 - 2nd Year';
  let selectedDate = '2026-11-14';
  let showModal = false;
  let modalTitle = '';
  let notice = '';
  let selectedRows = [];
  let selectedTeacher = null;
  let selectedStudent = null;
  let teacherRoleFilter = 'All Roles';
  let teacherStatusFilter = 'All Statuses';
  let studentProgramFilter = 'All Programs';
  let studentYearFilter = 'All Year Levels';
  let attendanceSection = 'All Sections';
  let auditSearch = '';
  let auditTypeFilter = 'All actions';
  let auditActorFilter = 'All actors';
  let currentPage = 1;
  let pageSize = 10;
  let sortKey = '';
  let sortDirection = 1;
  let selectedFile = '';
  let modalMode = 'generic';
  let modalRecord = null;
  let formValues = {};
  let confirmation = null;
  let selectedSection = 'All Sections';
  let attendanceSearch = '';
  let rfidValue = '';
  let rfidFeedback = 'Ready to scan...';
  let notificationOpen = false;
  let reportPeriod = '1st Semester';
  let reportFrequency = 'Weekly';
  let auditFrom = '';
  let auditTo = '';
  let rosterSearch = '';
  let profilePhoto = '';
  let notificationPreferences = { updates: true, attendance: true, announcements: true };
  let teachers = [];
  let students = [];
  let classes = [];
  let attendance = [];
  let audit = [];
  let registrations = [];
  let grades = [];
  let lastPath = '';

  onMount(() => {
    const stopHistory = watchHistory();
    const unsubscribe = routeLocation.subscribe(({ pathname }) => routeLocationChanged(pathname));
    return () => {
      unsubscribe();
      stopHistory();
    };
  });

  const adminNav = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Teachers', icon: Users },
    { label: 'Students', icon: GraduationCap },
    { label: 'Pending Approvals', icon: Clock3 },
    { label: 'Audit Log', icon: Activity },
    { label: 'Settings', icon: Settings }
  ];
  const teacherNav = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Attendance & RFID', icon: ScanLine },
    { label: 'Students', icon: GraduationCap },
    { label: 'Classes & Sections', icon: BookOpen },
    { label: 'Reports', icon: FileBarChart },
    { label: 'Settings', icon: Settings }
  ];

  $: navItems = portal === 'admin' ? adminNav : teacherNav;
  $: isAdmin = portal === 'admin';
  $: teachers = $appData.teachers;
  $: students = $appData.students;
  $: classes = $appData.classes;
  $: attendance = $appData.attendance;
  $: audit = $appData.audit;
  $: registrations = $appData.registrations;
  $: grades = $appData.grades;
  $: filteredTeachers = teachers.filter(t => `${t.name} ${t.email} ${t.department} ${t.id}`.toLowerCase().includes(searchText.toLowerCase())
    && (teacherRoleFilter === 'All Roles' || t.role === teacherRoleFilter)
    && (teacherStatusFilter === 'All Statuses' || (t.active === false ? 'Inactive' : t.status) === teacherStatusFilter));
  $: filteredStudents = students.filter(s => `${s.name} ${s.id} ${s.program}`.toLowerCase().includes(searchText.toLowerCase())
    && (studentProgramFilter === 'All Programs' || s.program === studentProgramFilter)
    && (studentYearFilter === 'All Year Levels' || s.year === studentYearFilter));
  $: visibleTeachers = sortRecords(filteredTeachers).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  $: visibleStudents = sortRecords(filteredStudents).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  $: teacherCount = teachers.filter(t => t.role === 'Teacher' && t.status === 'Approved' && t.active !== false).length;
  $: studentCount = students.filter(s => s.status === 'Active').length;
  $: pendingCount = registrations.filter(r => r.status === 'Pending').length;
  $: approvalRate = calculateApprovalRate(teachers, registrations);
  $: settingsKey = isAdmin ? 'admin' : `teacher:${currentUser?.email || 'default'}`;
  $: userSettings = $appData.settings[settingsKey] || $appData.settings[isAdmin ? 'admin' : 'teacher'];
  $: if ($storageError) notify($storageError);
  $: unreadNotifications = $appData.notifications.filter(item => item.role === (isAdmin ? 'admin' : 'teacher') && !item.read).length;
  $: selectedClassData = classes.find(c => c.name === selectedClass) || classes[0];
  $: sectionAttendance = attendance.filter(item => item.className === selectedClass && item.date === selectedDate && (attendanceSection === 'All Sections' || item.section === attendanceSection));
  $: filteredAttendance = sectionAttendance.filter(item => `${item.name} ${item.id} ${item.rfid}`.toLowerCase().includes(attendanceSearch.toLowerCase()));
  $: presentCount = sectionAttendance.filter(item => item.status === 'Present').length;
  $: lateCount = sectionAttendance.filter(item => item.status === 'Late').length;
  $: absentCount = sectionAttendance.filter(item => item.status === 'Absent').length;
  $: excusedCount = sectionAttendance.filter(item => item.status === 'Excused').length;
  $: attendanceRate = attendance.length ? Math.round(attendance.filter(item => item.status === 'Present').length / attendance.length * 100) : 0;
  $: reportAttendance = attendance.filter(item => !selectedClass || item.className === selectedClass);
  $: attendanceTrend = groupAttendance(reportAttendance, reportFrequency);
  $: reportGrades = grades.filter(item => (!selectedClass || item.className === selectedClass) && item.period === reportPeriod);
  $: filteredAudit = audit.filter(record => `${record.type} ${record.action} ${record.detail} ${record.target}`.toLowerCase().includes(auditSearch.toLowerCase())
    && (auditTypeFilter === 'All actions' || record.type === auditTypeFilter.toUpperCase())
    && (auditActorFilter === 'All actors' || record.action === auditActorFilter)
    && (!auditFrom || new Date(record.time) >= new Date(`${auditFrom}T00:00:00`))
    && (!auditTo || new Date(record.time) <= new Date(`${auditTo}T23:59:59`)));

  function go(label) {
    const role = get(authUser)?.role;
    const path = pathForPage(role, label);
    if (!path) {
      notify('This page is not available for your account.');
      return;
    }
    selectPage(label);
    if (get(routeLocation).pathname !== path) navigate(path);
  }
  function selectPage(label) {
    page = label;
    searchText = '';
    sidebarOpen = false;
    notice = '';
    currentPage = 1;
    if (label === 'Settings') {
      selectedTab = 'Profile';
      loadSettingsDraft();
    } else if (label === 'Reports') selectedTab = 'Attendance';
    else if (label === 'Classes & Sections') selectedTab = 'My Classes';
  }
  function routeLocationChanged(pathname) {
    if (pathname === lastPath) return;
    lastPath = pathname;
    const user = get(authUser);

    if (pathname === '/login') {
      if (user) {
        portal = user.role;
        navigate(dashboardPath(user.role), { replace: true });
        return;
      }
      portal = 'auth';
      page = 'Dashboard';
      authMode = 'login';
      return;
    }

    const route = resolvePortalRoute(pathname);
    if (!route) {
      navigate(user ? dashboardPath(user.role) : '/login', { replace: true });
      return;
    }
    if (!user) {
      authRole = route.role;
      portal = 'auth';
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== route.role) {
      portal = user.role;
      navigate(dashboardPath(user.role), { replace: true });
      return;
    }

    portal = user.role;
    authRole = user.role;
    teacherAuthenticated = user.role === 'teacher';
    selectPage(route.page);
  }
  function focusPageSearch() {
    const searchField = document.getElementById('page-search');
    if (searchField) {
      searchField.focus();
      return;
    }
    go(isAdmin ? 'Teachers' : 'Students');
    setTimeout(() => document.getElementById('page-search')?.focus(), 0);
  }
  function switchPortal(value) {
    if (currentUser) addAudit('LOGOUT', currentUser.name, `Switched from ${currentUser.role} portal`, currentUser.email);
    signOut();
    portal = 'auth';
    teacherAuthenticated = false;
    authRole = value;
    rememberMe = false;
    authError = '';
    setAuthMode('login');
    page = 'Dashboard';
    searchText = '';
    sidebarOpen = false;
    navigate('/login', { replace: true });
  }
  function setAuthMode(value) {
    authMode = value;
    if (value === 'signup') authRole = 'teacher';
    showPassword = false;
    loginPassword = '';
    signupPassword = '';
    signupPasswordConfirm = '';
    authError = '';
  }
  function setAuthRole(value) {
    authRole = value;
    authError = '';
    loginEmail = '';
    loginPassword = '';
    rememberMe = false;
    setAuthMode('login');
  }
  function logOut() {
    const role = isAdmin ? 'admin' : 'teacher';
    addAudit('LOGOUT', currentUser?.name || 'System', `${role === 'admin' ? 'Administrator' : 'Teacher'} logged out`, currentUser?.email || '—');
    signOut();
    portal = 'auth';
    teacherAuthenticated = false;
    authRole = role;
    rememberMe = false;
    setAuthMode('login');
    navigate('/login', { replace: true });
    notify('You have been logged out.');
  }
  function handleTeacherAuth(event) {
    event.preventDefault();
    if (authMode === 'signup') {
      if (signupPassword !== signupPasswordConfirm) {
        authError = 'The passwords do not match.';
        return;
      }
      const email = loginEmail.trim().toLowerCase();
      const duplicate = $appData.accounts.some(account => account.email.toLowerCase() === email)
        || registrations.some(registration => registration.email.toLowerCase() === email);
      if (duplicate) {
        authError = 'An account or registration with this email already exists.';
        return;
      }
      const registration = {
        id: `registration-${Date.now()}`,
        name: signupName.trim(),
        email,
        department: signupDepartment,
        password: signupPassword,
        submitted: new Date().toLocaleDateString(),
        status: 'Pending'
      };
      updateData(data => {
        data.registrations.unshift(registration);
        data.notifications.unshift({ id: `notification-${Date.now()}`, title: 'Teacher registration pending', detail: `${registration.name} requested teacher access.`, read: false, role: 'admin' });
        data.audit.unshift({ type: 'REGISTER', action: registration.name, detail: 'Submitted teacher registration', target: email, time: new Date().toLocaleString() });
      });
      loginEmail = email;
      signupName = '';
      signupDepartment = '';
      setAuthMode('login');
      notify('Registration submitted. An administrator must approve your account.');
      return;
    }

    const email = loginEmail.trim().toLowerCase();
    let result;
    try {
      result = signIn(email, loginPassword, authRole, rememberMe);
    } catch (error) {
      authError = 'Unable to save your session in this browser. Check storage permissions and try again.';
      return;
    }

    if (!result.account) {
      authError = result.error === 'inactive'
        ? 'This account is inactive or awaiting administrator approval.'
        : result.error === 'role'
          ? 'This account cannot access the selected portal.'
          : 'The email or password is incorrect.';
      return;
    }
    const account = result.account;
    portal = account.role;
    authRole = account.role;
    teacherAuthenticated = account.role === 'teacher';
    page = 'Dashboard';
    loginPassword = '';
    showPassword = false;
    navigate(dashboardPath(account.role), { replace: true });
    addAudit('LOGIN', account.name, `${account.role === 'admin' ? 'Administrator' : 'Teacher'} logged in`, account.email);
    notify(`Signed in to the ${account.role === 'admin' ? 'administration' : 'teacher'} portal.`);
  }
  function updateAuthPassword(event) {
    authError = '';
    if (authMode === 'login') loginPassword = event.currentTarget.value;
    else signupPassword = event.currentTarget.value;
  }
  function addAudit(type, action, detail, target) {
    updateData(data => {
      data.audit.unshift({ type, action, detail, target, time: new Date().toLocaleString() });
    });
  }
  function sortRecords(records) {
    if (!sortKey) return records;
    return [...records].sort((a, b) => {
      if (sortKey === 'time') return (new Date(a.time).getTime() - new Date(b.time).getTime()) * sortDirection;
      return String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true }) * sortDirection;
    });
  }
  function calculateApprovalRate(teacherRecords, registrationRecords) {
    const accounts = new Map(teacherRecords.filter(item => item.role === 'Teacher').map(item => [item.email.toLowerCase(), item.status]));
    registrationRecords.forEach(item => {
      if (!accounts.has(item.email.toLowerCase())) accounts.set(item.email.toLowerCase(), item.status);
    });
    const records = [...accounts.values()];
    return records.length ? Math.round(records.filter(status => status === 'Approved').length / records.length * 100) : 0;
  }
  function groupAttendance(records, frequency) {
    const groups = new Map();
    records.forEach(record => {
      const date = new Date(`${record.date}T12:00:00`);
      let label = record.date;
      if (frequency === 'Weekly') {
        const start = new Date(date);
        start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        label = `Week of ${start.toISOString().slice(0, 10)}`;
      } else if (frequency === 'Monthly') {
        label = record.date.slice(0, 7);
      }
      const group = groups.get(label) || { label, present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      group.total += 1;
      if (record.status === 'Present') group.present += 1;
      else if (record.status === 'Absent') group.absent += 1;
      else if (record.status === 'Late') group.late += 1;
      else if (record.status === 'Excused') group.excused += 1;
      groups.set(label, group);
    });
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  function sortBy(key) {
    if (sortKey === key) sortDirection *= -1;
    else {
      sortKey = key;
      sortDirection = 1;
    }
  }
  function toggleAllRows(records) {
    const ids = records.map(record => record.id);
    selectedRows = ids.every(id => selectedRows.includes(id))
      ? selectedRows.filter(id => !ids.includes(id))
      : [...new Set([...selectedRows, ...ids])];
  }
  function changePageSize(event) {
    pageSize = Number(event.currentTarget.value);
    currentPage = 1;
  }
  function exportRecords(filename, records) {
    if (exportCsv(filename, records)) notify(`${filename} downloaded.`);
    else notify('There are no records to export.');
  }
  function openModal(title, record = null, mode = 'generic') {
    modalTitle = title;
    modalRecord = record;
    modalMode = mode;
    showModal = true;
  }
  function closeModal() {
    showModal = false;
    modalRecord = null;
    confirmation = null;
    modalMode = 'generic';
  }
  function openTeacherForm(record = null) {
    modalRecord = record;
    modalTitle = record ? 'Edit Teacher' : 'Add Teacher';
    modalMode = 'teacher-form';
    formValues = record ? { ...record } : { name: '', id: '', department: '', email: '', role: 'Teacher', status: 'Approved', active: true };
    showModal = true;
  }
  function openTeacherDetails(record) {
    openModal(`Account: ${record.name}`, record, 'teacher-view');
  }
  function openStudentDetails(record) {
    openModal(`Student: ${record.name}`, record, 'student-view');
  }
  function openRegistration(record) {
    openModal(`Registration: ${record.name}`, record, 'registration-view');
  }
  function askConfirmation(type, record, title, detail, fields = {}) {
    confirmation = { type, record };
    modalTitle = title;
    modalMode = 'confirm';
    modalRecord = record;
    formValues = { ...fields, detail };
    showModal = true;
  }
  function submitModalForm(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (modalMode === 'teacher-form') {
      const email = String(values.email).trim().toLowerCase();
      const staffId = String(values.id).trim();
      if (!String(values.name).trim() || !/^\d+$/.test(staffId) || !String(values.department).trim()) {
        notify('Enter a name, numeric staff ID, and department.');
        return;
      }
      const duplicateTeacher = teachers.some(teacher => teacher.id === staffId && teacher.id !== modalRecord?.id)
        || teachers.some(teacher => teacher.email.toLowerCase() === email && teacher.id !== modalRecord?.id);
      const duplicateAccount = $appData.accounts.some(account => account.email.toLowerCase() === email && account.email.toLowerCase() !== modalRecord?.email.toLowerCase());
      if (duplicateTeacher || duplicateAccount) {
        notify('A teacher with this staff ID or email already exists.');
        return;
      }
      const teacher = {
        id: staffId,
        name: String(values.name).trim(),
        department: String(values.department).trim(),
        email,
        role: 'Teacher',
        status: String(values.status),
        active: values.status === 'Approved',
        registered: modalRecord?.registered || new Date().toLocaleDateString(),
        last: modalRecord?.last || 'Never'
      };
      updateData(data => {
        if (modalRecord) {
          data.teachers = data.teachers.map(item => item.id === modalRecord.id ? teacher : item);
          data.accounts = data.accounts.map(account => account.email === modalRecord.email ? { ...account, email, name: teacher.name, teacherId: staffId, active: teacher.active } : account);
          if (data.settings[`teacher:${modalRecord.email}`]) {
            data.settings[`teacher:${email}`] = { ...data.settings[`teacher:${modalRecord.email}`], email, firstName: teacher.name.split(' ')[0], lastName: teacher.name.split(' ').slice(1).join(' '), department: teacher.department };
            if (email !== modalRecord.email) delete data.settings[`teacher:${modalRecord.email}`];
          }
        } else {
          data.teachers.unshift(teacher);
          data.accounts.push({ email, password: 'Teacher123!', role: 'teacher', name: teacher.name, teacherId: staffId, active: teacher.active });
        }
        data.audit.unshift({ type: modalRecord ? 'UPDATE' : 'CREATE', action: currentUser?.name || 'Admin', detail: `${modalRecord ? 'Updated' : 'Added'} teacher account for ${teacher.name}`, target: email, time: new Date().toLocaleString() });
      });
      closeModal();
      notify(modalRecord ? 'Teacher account updated.' : 'Teacher account added. Demo password: Teacher123!');
      return;
    }
    notify('This form is not available.');
  }
  function runConfirmation() {
    if (!confirmation) return;
    const { type, record } = confirmation;
    if (type === 'delete-teacher') {
      updateData(data => {
        data.teachers = data.teachers.filter(item => item.id !== record.id);
        data.accounts = data.accounts.filter(account => account.teacherId !== record.id);
        data.audit.unshift({ type: 'DELETE', action: currentUser?.name || 'Admin', detail: `Deleted teacher account for ${record.name}`, target: record.email, time: new Date().toLocaleString() });
      });
      selectedRows = selectedRows.filter(id => id !== record.id);
      closeModal();
      notify('Teacher account deleted.');
    } else if (type === 'teacher-status') {
      const active = !record.active;
      updateData(data => {
        data.teachers = data.teachers.map(item => item.id === record.id ? { ...item, active } : item);
        data.accounts = data.accounts.map(account => account.teacherId === record.id ? { ...account, active } : account);
        data.audit.unshift({ type: 'UPDATE', action: currentUser?.name || 'Admin', detail: `${active ? 'Activated' : 'Deactivated'} ${record.name}'s account`, target: record.email, time: new Date().toLocaleString() });
      });
      closeModal();
      notify(`Teacher account ${active ? 'activated' : 'deactivated'}.`);
    } else if (type === 'attendance-status') {
      saveAttendanceStatus(record, formValues.status);
      closeModal();
      notify(`${record.name} marked ${formValues.status.toLowerCase()}.`);
    } else if (type === 'attendance-remark') {
      saveAttendanceRemark(record, formValues.remarks);
      closeModal();
      notify('Attendance remarks updated.');
    } else if (type === 'bulk-delete' || type === 'bulk-activate' || type === 'bulk-deactivate') {
      const ids = record;
      updateData(data => {
        if (type === 'bulk-delete') {
          data.teachers = data.teachers.filter(item => !ids.includes(item.id));
          data.accounts = data.accounts.filter(account => !ids.includes(account.teacherId));
        } else {
          const active = type === 'bulk-activate';
          data.teachers = data.teachers.map(item => ids.includes(item.id) ? { ...item, active } : item);
          data.accounts = data.accounts.map(account => ids.includes(account.teacherId) ? { ...account, active } : account);
        }
        data.audit.unshift({ type: type === 'bulk-delete' ? 'DELETE' : 'UPDATE', action: currentUser?.name || 'Admin', detail: `${type.replace('bulk-', '')} applied to ${ids.length} teacher account(s)`, target: ids.join(', '), time: new Date().toLocaleString() });
      });
      selectedRows = selectedRows.filter(id => !ids.includes(id));
      closeModal();
      notify(`${ids.length} selected account(s) updated.`);
    } else if (type === 'registration-approve' || type === 'registration-reject') {
      const status = type === 'registration-approve' ? 'Approved' : 'Rejected';
      updateData(data => {
        data.registrations = data.registrations.map(item => item.id === record.id ? { ...item, status } : item);
        if (status === 'Approved') {
          const staffId = String(Date.now()).slice(-6);
          data.teachers.unshift({ id: staffId, name: record.name, department: record.department, email: record.email, role: 'Teacher', status: 'Approved', active: true, registered: record.submitted, last: 'Never' });
          data.accounts.push({ email: record.email, password: record.password, role: 'teacher', name: record.name, teacherId: staffId, active: true });
            const [firstName, ...lastName] = record.name.split(' ');
            data.settings[`teacher:${record.email}`] = { firstName, lastName: lastName.join(' '), email: record.email, department: record.department, photo: '', notifications: { updates: true, attendance: true, announcements: true }, appearance: 'Light' };
          data.notifications.unshift({ id: `notification-${Date.now()}`, title: 'Teacher account approved', detail: 'Your teacher account is ready to use.', read: false, role: 'teacher' });
        }
        data.notifications.unshift({ id: `notification-${Date.now()}-admin`, title: `Registration ${status.toLowerCase()}`, detail: `${record.name}'s registration was ${status.toLowerCase()}.`, read: false, role: 'admin' });
        data.audit.unshift({ type: status.toUpperCase(), action: currentUser?.name || 'Admin', detail: `${status} teacher registration for ${record.name}`, target: record.email, time: new Date().toLocaleString() });
      });
      closeModal();
      notify(`Registration ${status.toLowerCase()}.`);
    } else if (type === 'reset-data') {
      resetDemoData();
      signOut();
      portal = 'auth';
      teacherAuthenticated = false;
      authRole = 'admin';
      rememberMe = false;
      navigate('/login', { replace: true });
      closeModal();
      notify('Demo data has been reset. Sign in again to continue.');
      return;
    }
  }
  function startRegistrationDecision(record, approve) {
    askConfirmation(
      approve ? 'registration-approve' : 'registration-reject',
      record,
      `${approve ? 'Approve' : 'Reject'} Registration`,
      `Are you sure you want to ${approve ? 'approve' : 'reject'} ${record.name}'s teacher registration?`
    );
  }
  function saveAttendanceStatus(record, status) {
    updateData(data => {
      data.attendance = data.attendance.map(item => item.id === record.id && item.className === record.className && item.date === record.date
        ? { ...item, status, time: status === 'Absent' ? '—' : (item.time === '—' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.time) }
        : item);
      data.audit.unshift({ type: 'ATTENDANCE', action: currentUser?.name || 'Teacher', detail: `Updated ${record.name} to ${status}`, target: record.id, time: new Date().toLocaleString() });
    });
  }
  function saveAttendanceRemark(record, remarks) {
    updateData(data => {
      data.attendance = data.attendance.map(item => item.id === record.id && item.className === record.className && item.date === record.date ? { ...item, remarks } : item);
    });
  }
  function requestAttendanceStatus(record, status, event) {
    askConfirmation('attendance-status', record, 'Confirm attendance update', `Change ${record.name}'s status from ${record.status} to ${status}?`, { status });
    event.currentTarget.value = record.status;
  }
  function requestAttendanceRemark(record, remarks, event) {
    askConfirmation('attendance-remark', record, 'Confirm remarks update', `Save the attendance remarks for ${record.name}?`, { remarks });
    event.currentTarget.value = record.remarks || '';
  }
  function simulateRfidScan(event) {
    event.preventDefault();
    const lookup = rfidValue.trim().toLowerCase();
    const student = students.find(item => String(item.id || '').toLowerCase() === lookup || String(item.rfid || '').toLowerCase() === lookup);
    if (!student || student.className !== selectedClass || (attendanceSection !== 'All Sections' && student.section !== attendanceSection)) {
      rfidFeedback = 'No matching student found in this class and section.';
      return;
    }
    const existing = attendance.find(item => item.id === student.id && item.className === selectedClass && item.date === selectedDate);
    if (existing && existing.status !== 'Absent') {
      rfidFeedback = `${student.name} is already marked ${existing.status.toLowerCase()}.`;
      rfidValue = '';
      return;
    }
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updateData(data => {
      if (existing) {
        data.attendance = data.attendance.map(item => item.id === student.id && item.className === selectedClass && item.date === selectedDate ? { ...item, status: 'Present', time } : item);
      } else {
        data.attendance.unshift({ ...student, className: selectedClass, date: selectedDate, status: 'Present', time, remarks: '' });
      }
      data.audit.unshift({ type: 'ATTENDANCE', action: currentUser?.name || 'Teacher', detail: `RFID scan marked ${student.name} present`, target: student.id, time: new Date().toLocaleString() });
    });
    rfidFeedback = `${student.name} marked present at ${time}.`;
    rfidValue = '';
  }
  function markNotificationRead(id) {
    updateData(data => {
      data.notifications = data.notifications.map(item => item.id === id ? { ...item, read: true } : item);
    });
  }
  function markAllNotificationsRead() {
    const role = isAdmin ? 'admin' : 'teacher';
    updateData(data => {
      data.notifications = data.notifications.map(item => item.role === role ? { ...item, read: true } : item);
    });
  }
  function loadSettingsDraft() {
    const settings = userSettings;
    profilePhoto = settings.photo || '';
    notificationPreferences = { ...settings.notifications };
  }
  function saveProfile(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const email = String(values.email).trim().toLowerCase();
    if ($appData.accounts.some(account => account.email.toLowerCase() === email && account.role === (isAdmin ? 'admin' : 'teacher') && account.email !== userSettings.email)) {
      notify('That email is already in use.');
      return;
    }
    const name = `${String(values.firstName).trim()} ${String(values.lastName).trim()}`.trim();
    updateData(data => {
      const updatedSettings = { ...userSettings, firstName: String(values.firstName).trim(), lastName: String(values.lastName).trim(), email, department: String(values.department).trim(), photo: profilePhoto };
      const nextSettingsKey = isAdmin ? 'admin' : `teacher:${email}`;
      data.settings[nextSettingsKey] = updatedSettings;
      if (!isAdmin && settingsKey !== nextSettingsKey) delete data.settings[settingsKey];
      data.accounts = data.accounts.map(account => account.role === (isAdmin ? 'admin' : 'teacher') && account.email === userSettings.email ? { ...account, email, name } : account);
      data.teachers = data.teachers.map(teacher => teacher.email === userSettings.email ? { ...teacher, email, name, department: String(values.department).trim() } : teacher);
      data.audit.unshift({ type: 'UPDATE', action: currentUser?.name || name, detail: 'Updated account profile', target: email, time: new Date().toLocaleString() });
    });
    const updatedUser = { ...currentUser, email, name };
    try {
      updateAuthUser(updatedUser);
    } catch (error) {
      notify('Profile saved, but the updated session could not be saved.');
      return;
    }
    notify('Profile changes saved.');
  }
  function handlePhotoChange(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file for your profile photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => profilePhoto = String(reader.result);
    reader.onerror = () => notify('The selected profile image could not be read.');
    reader.readAsDataURL(file);
  }
  function changePassword(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.newPassword !== values.confirmPassword) {
      notify('The new passwords do not match.');
      return;
    }
    const role = isAdmin ? 'admin' : 'teacher';
    const account = $appData.accounts.find(item => item.email === currentUser.email && item.role === role);
    if (!account || account.password !== values.currentPassword) {
      notify('The current password is incorrect.');
      return;
    }
    updateData(data => {
      data.accounts = data.accounts.map(item => item.email === account.email && item.role === role ? { ...item, password: values.newPassword } : item);
      data.audit.unshift({ type: 'UPDATE', action: currentUser.name, detail: 'Changed account password', target: currentUser.email, time: new Date().toLocaleString() });
    });
    notify('Password updated.');
    event.currentTarget.reset();
  }
  function saveNotificationPreferences() {
    updateData(data => {
      data.settings[settingsKey].notifications = { ...notificationPreferences };
      data.audit.unshift({ type: 'UPDATE', action: currentUser?.name || 'System', detail: 'Updated notification preferences', target: currentUser?.email || '—', time: new Date().toLocaleString() });
    });
    notify('Notification preferences saved.');
  }
  function saveAppearance(value) {
    updateData(data => {
      data.settings[settingsKey].appearance = value;
    });
    notify(`${value} appearance saved.`);
  }
  function notify(message) {
    notice = message;
    setTimeout(() => {
      if (notice === message) notice = '';
    }, 2800);
  }
  function toggleRow(id) {
    selectedRows = selectedRows.includes(id) ? selectedRows.filter(x => x !== id) : [...selectedRows, id];
  }
  function statusClass(status) {
    return status.toLowerCase().replaceAll(' ', '-');
  }
</script>

<svelte:head>
  <title>{portal === 'auth' ? `${authRole === 'admin' ? 'Administration' : 'Teacher'} ${authMode === 'login' ? 'Login' : 'Sign Up'} | E-Index` : `${page} | E-Index ${portal === 'admin' ? 'Administration' : 'Teacher Portal'}`}</title>
</svelte:head>

{#if !isAdmin && !teacherAuthenticated}
  <main class="auth-page">
    <section class="auth-story">
      <button class="auth-brand" onclick={() => switchPortal('admin')} aria-label="Return to administration dashboard">
        <span class="auth-brand-mark">E</span>
        <span><strong>E-Index</strong><small>ACADEMIC PORTAL</small></span>
      </button>
      <div class="auth-story-content">
        <span class="auth-eyebrow"><span></span> YOUR ACADEMIC WORKSPACE</span>
        <h1>Make every<br/>school day <em>count.</em></h1>
        <p>Everything you need to manage classes, record attendance, and keep your students on track — all in one place.</p>
        <div class="auth-feature-card">
          <div class="auth-feature-icon"><CalendarDays size={19}/></div>
          <div><strong>Your teaching day, at a glance</strong><span>Classes, attendance, and reports in one workspace.</span></div>
          <ArrowUpRight size={17} class="auth-feature-arrow"/>
        </div>
      </div>
      <div class="auth-story-footer"><ShieldCheck size={15}/> A secure workspace for educators <span>·</span> AY 2026–2027</div>
      <div class="auth-orb auth-orb-one"></div>
      <div class="auth-orb auth-orb-two"></div>
    </section>

    <section class="auth-panel">
      <div class="auth-panel-top"><span>E-INDEX ACCESS</span><button onclick={() => setAuthRole(authRole === 'admin' ? 'teacher' : 'admin')}>{authRole === 'admin' ? 'Teacher sign in' : 'Administration sign in'} <ArrowUpRight size={14}/></button></div>
      <div class="auth-form-wrap">
        <div class="auth-mobile-brand"><span class="auth-brand-mark">E</span><strong>E-Index</strong></div>
        <div class="auth-heading">
          <span class="auth-heading-icon">{#if authMode === 'login'}<Lock size={19}/>{:else}<UserRound size={20}/>{/if}</span>
          <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{authMode === 'login' ? `Sign in to your ${authRole === 'admin' ? 'administration' : 'teacher'} workspace.` : 'Register with your school details to request teacher access.'}</p>
        </div>

        {#if authMode === 'login'}
          <div class="auth-role-tabs" role="group" aria-label="Choose a portal">
            <button class:auth-role-active={authRole === 'teacher'} onclick={() => setAuthRole('teacher')}>Teacher</button>
            <button class:auth-role-active={authRole === 'admin'} onclick={() => setAuthRole('admin')}>Administration</button>
          </div>
        {/if}
        <div class="auth-tabs" role="tablist" aria-label="Teacher account access">
          <button class:auth-tab-active={authMode === 'login'} role="tab" aria-selected={authMode === 'login'} onclick={() => setAuthMode('login')}>Sign in</button>
          {#if authRole === 'teacher'}<button class:auth-tab-active={authMode === 'signup'} role="tab" aria-selected={authMode === 'signup'} onclick={() => setAuthMode('signup')}>Create account</button>{/if}
        </div>

        <form class="auth-form" onsubmit={handleTeacherAuth}>
          {#if authMode === 'signup'}
            <label>Full name
              <span class="auth-input-wrap"><UserRound size={16}/><input autocomplete="name" name="name" placeholder="e.g. Alex Santos" bind:value={signupName} required/></span>
            </label>
          {/if}
          <label>School email
            <span class="auth-input-wrap"><Mail size={16}/><input type="email" autocomplete="email" name="email" placeholder="you@school.edu.ph" bind:value={loginEmail} required/></span>
          </label>
          {#if authMode === 'signup'}
            <label>Department
              <span class="auth-input-wrap"><Building2 size={16}/><select name="department" bind:value={signupDepartment} required><option value="" disabled>Select your department</option><option>Computer Studies</option><option>Education</option><option>Arts and Sciences</option><option>Business</option><option>Other</option></select><ChevronDown size={15}/></span>
            </label>
          {/if}
          <label>Password
            <span class="auth-input-wrap"><Lock size={16}/><input type={showPassword ? 'text' : 'password'} autocomplete={authMode === 'login' ? 'current-password' : 'new-password'} name="password" placeholder={authMode === 'login' ? 'Enter your password' : 'At least 8 characters'} minlength="8" value={authMode === 'login' ? loginPassword : signupPassword} oninput={updateAuthPassword} required/><button class="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}><Eye size={16}/></button></span>
          </label>
          {#if authMode === 'signup'}
            <label>Confirm password
              <span class="auth-input-wrap"><Lock size={16}/><input type={showPassword ? 'text' : 'password'} autocomplete="new-password" name="password-confirm" placeholder="Re-enter your password" minlength="8" bind:value={signupPasswordConfirm} required/><button class="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}><Eye size={16}/></button></span>
            </label>
          {/if}
          {#if authMode === 'login'}
            <div class="auth-form-options"><label class="auth-remember"><input type="checkbox" bind:checked={rememberMe}/> Remember me</label><button type="button" class="auth-text-button" onclick={() => notify('Password reset is not available in this frontend demo.')}>Forgot password?</button></div>
          {/if}
          {#if authError}<p class="auth-error" role="alert">{authError}</p>{/if}
          <button class="auth-submit" type="submit">{authMode === 'login' ? 'Sign in to your account' : 'Request teacher access'} <ArrowRight size={17}/></button>
        </form>

        {#if authMode === 'login'}
          <div class="auth-demo-note"><ShieldCheck size={16}/><span><strong>Sample {authRole} account</strong><br/>{authRole === 'admin' ? 'admin@gmail.com / Admin123!' : 'jinkysuson09@gmail.com / Teacher123!'}<br/>Frontend demo only; credentials are not secure.</span></div>
        {:else}
          <div class="auth-demo-note"><ShieldCheck size={16}/><span><strong>Frontend demo</strong> — registration is saved locally and waits for administrator approval.</span></div>
        {/if}
      </div>
      <footer class="auth-panel-footer">© 2026 E-Index <span>·</span> Built for better learning</footer>
    </section>
  </main>
{:else}
<div class:teacher-shell={!isAdmin} class="app-shell">
  {#if sidebarOpen}
    <button class="mobile-scrim" aria-label="Close menu" onclick={() => sidebarOpen = false}></button>
  {/if}
  <aside class:open={sidebarOpen} class:collapsed={sidebarCollapsed} class="sidebar">
    <div class="brand">
      <div class="brand-mark">E</div>
      <div><strong>E-Index</strong><small>{isAdmin ? 'ADMINISTRATION' : 'TEACHER PORTAL'}</small></div>
      <button class="icon-btn mobile-close" onclick={() => sidebarOpen = false}><X size={18}/></button>
    </div>
    <div class="nav-caption">ACADEMIC WORKSPACE</div>
    <nav>
      {#each navItems as item}
        <button class:active={page === item.label} class="nav-item" onclick={() => go(item.label)}>
          <svelte:component this={item.icon} size={17} strokeWidth={2.1}/>
          <span>{item.label}</span>
        </button>
      {/each}
    </nav>
    <div class="sidebar-bottom">
      <button class="nav-item" onclick={logOut}><LogOut size={17}/><span>Log out</span></button>
      <button class="nav-item collapse-item" aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'} onclick={() => sidebarCollapsed = !sidebarCollapsed}><PanelLeftClose size={17}/><span>{sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}</span></button>
    </div>
  </aside>

  <main class="main-area">
    <header class="topbar">
      <button class="icon-btn menu-toggle" onclick={() => sidebarOpen = true}><Menu size={20}/></button>
      <div class="breadcrumbs"><span>{isAdmin ? 'Administration' : 'Teacher Portal'}</span><b>/</b><strong>{page}</strong></div>
      <div class="top-actions">
        <div class="semester-select"><CalendarDays size={14}/> AY 2026-2027 · 1st Semester <ChevronDown size={13}/></div>
        <button class="icon-btn search-top" aria-label="Search records" onclick={focusPageSearch}><Search size={18}/></button>
        <div class="notification-wrap"><button class="icon-btn notification-btn" aria-label="Notifications" aria-expanded={notificationOpen} onclick={() => notificationOpen = !notificationOpen}><Bell size={18}/>{#if unreadNotifications}<i></i>{/if}</button>
          {#if notificationOpen}<section class="notification-popover"><div class="notification-popover-heading"><strong>Notifications</strong><button onclick={markAllNotificationsRead}>Mark all read</button></div>{#each $appData.notifications.filter(item => item.role === (isAdmin ? 'admin' : 'teacher')).slice(0, 6) as item}<button class:unread={!item.read} class="notification-row" onclick={() => markNotificationRead(item.id)}><span class="notification-dot"></span><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>{:else}<p class="notification-empty">You're all caught up.</p>{/each}</section>{/if}
        </div>
        <button class="profile-chip" onclick={() => go('Settings')}><span class="avatar-mini">{#if userSettings.photo}<img src={userSettings.photo} alt="Profile"/>{:else}{userSettings.firstName[0]}{userSettings.lastName[0]}{/if}</span><span>{userSettings.firstName} {userSettings.lastName}<small>{isAdmin ? 'System Admin' : 'Teacher'}</small></span><ChevronDown size={13}/></button>
      </div>
    </header>

    <div class="page-content">
      {#if page === 'Dashboard' && isAdmin}
        <AdminDashboard
          userSettings={userSettings}
          teacherCount={teacherCount}
          studentCount={studentCount}
          pendingCount={pendingCount}
          approvalRate={approvalRate}
          onNavigate={go}
        />
      {:else if page === 'Dashboard' && !isAdmin}
        <TeacherDashboard
          userSettings={userSettings}
          classes={classes}
          studentCount={studentCount}
          attendanceRate={attendanceRate}
          onNavigate={go}
        />

      {:else if page === 'Teachers' && isAdmin}
        <PageTitle icon={Users} title="Teacher Accounts" subtitle="Review teacher access and manage account status." action="Add Teacher" onAction={() => openTeacherForm()}/>
        <section class="panel table-panel">
          <div class="toolbar"><div class="search-field"><Search size={16}/><input id="page-search" bind:value={searchText} oninput={() => currentPage = 1} placeholder="Search name, email, or staff ID..."/></div><select bind:value={teacherRoleFilter} onchange={() => currentPage = 1}><option>All Roles</option><option>Teacher</option><option>Admin</option></select><select bind:value={teacherStatusFilter} onchange={() => currentPage = 1}><option>All Statuses</option><option>Approved</option><option>Pending</option><option>Inactive</option></select><button class="outline-btn" onclick={() => exportRecords('teachers.csv', filteredTeachers)}>Export CSV</button><select aria-label="Bulk actions" onchange={event => { if (event.currentTarget.value === 'activate' || event.currentTarget.value === 'deactivate') { if (selectedRows.length) askConfirmation(`bulk-${event.currentTarget.value}`, selectedRows, `${event.currentTarget.value === 'activate' ? 'Activate' : 'Deactivate'} selected accounts`, `Apply this action to ${selectedRows.length} selected account(s)?`); else notify('Select teacher accounts before choosing a bulk action.'); } else if (event.currentTarget.value === 'delete') { if (selectedRows.length) askConfirmation('bulk-delete', selectedRows, 'Delete selected accounts', `Permanently remove ${selectedRows.length} selected account(s)?`); else notify('Select teacher accounts before choosing a bulk action.'); } event.currentTarget.value = ''; }}><option value="">Bulk Actions</option><option value="activate">Activate</option><option value="deactivate">Deactivate</option><option value="delete">Delete</option></select></div>
          <div class="table-scroll"><table><thead><tr><th><input type="checkbox" checked={visibleTeachers.length > 0 && visibleTeachers.every(t => selectedRows.includes(t.id))} onchange={() => toggleAllRows(visibleTeachers)} aria-label="Select all visible teachers"/></th><th><button class="sort-button" onclick={() => sortBy('name')}>Name ↕</button></th><th><button class="sort-button" onclick={() => sortBy('id')}>Staff ID ↕</button></th><th><button class="sort-button" onclick={() => sortBy('department')}>Department ↕</button></th><th><button class="sort-button" onclick={() => sortBy('email')}>Email ↕</button></th><th>Role</th><th><button class="sort-button" onclick={() => sortBy('status')}>Status ↕</button></th><th><button class="sort-button" onclick={() => sortBy('registered')}>Registered ↕</button></th><th>Last Login</th><th>Actions</th></tr></thead><tbody>
            {#each visibleTeachers as t}<tr><td><input type="checkbox" checked={selectedRows.includes(t.id)} onchange={() => toggleRow(t.id)} aria-label={`Select ${t.name}`}/></td><td><button class="table-link" onclick={() => openTeacherDetails(t)}><div class="name-cell"><span class="initial-badge">{t.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{t.name}</strong></div></button></td><td>{t.id}</td><td>{t.department}</td><td>{t.email}</td><td><span class="role-pill">{t.role}</span></td><td><span class={`status ${t.status === 'Approved' ? 'approved' : 'pending'}`}>{t.active === false ? 'Inactive' : t.status}</span></td><td>{t.registered}</td><td>{t.last}</td><td><div class="row-actions"><button class="icon-btn row-action" aria-label={`View ${t.name}`} onclick={() => openTeacherDetails(t)}><Eye size={16}/></button><button class="icon-btn row-action" aria-label={`Edit ${t.name}`} onclick={() => openTeacherForm(t)}><Pencil size={15}/></button><button class="icon-btn row-action" aria-label={`${t.active === false ? 'Activate' : 'Deactivate'} ${t.name}`} onclick={() => askConfirmation('teacher-status', t, `${t.active === false ? 'Activate' : 'Deactivate'} account`, `${t.active === false ? 'Activate' : 'Deactivate'} ${t.name}'s account?`)}><RefreshCw size={15}/></button><button class="icon-btn row-action" aria-label={`Delete ${t.name}`} onclick={() => askConfirmation('delete-teacher', t, 'Delete teacher account', `Delete ${t.name}'s account? This cannot be undone.`)}><Trash2 size={15}/></button></div></td></tr>{:else}<tr><td colspan="10" class="empty-table">No teacher accounts match these filters.</td></tr>{/each}
          </tbody></table></div><div class="table-footer"><span>Rows per page <select value={pageSize} onchange={changePageSize}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></span><span>Showing {filteredTeachers.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredTeachers.length)} of {filteredTeachers.length}</span><button class="pagination" disabled={currentPage === 1} onclick={() => currentPage -= 1}><ChevronLeft size={14}/></button><span>Page {currentPage} of {Math.max(1, Math.ceil(filteredTeachers.length / pageSize))}</span><button class="pagination" disabled={currentPage >= Math.ceil(filteredTeachers.length / pageSize)} onclick={() => currentPage += 1}><ChevronRight size={14}/></button></div>
        </section>

      {:else if page === 'Students'}
        <PageTitle icon={GraduationCap} title="Students" subtitle={isAdmin ? 'View and manage student records.' : 'View your enrolled students.'} action="Export List" onAction={() => exportRecords('students.csv', filteredStudents)}/>
        <section class="panel table-panel">
          <div class="toolbar"><div class="search-field"><Search size={16}/><input id="page-search" bind:value={searchText} oninput={() => currentPage = 1} placeholder="Search student name or ID..."/></div><select bind:value={studentProgramFilter} onchange={() => currentPage = 1}><option>All Programs</option>{#each [...new Set(students.map(student => student.program))] as program}<option>{program}</option>{/each}</select><select bind:value={studentYearFilter} onchange={() => currentPage = 1}><option>All Year Levels</option>{#each [...new Set(students.map(student => student.year))] as year}<option>{year}</option>{/each}</select></div>
          <div class="table-scroll"><table><thead><tr><th><input type="checkbox" checked={visibleStudents.length > 0 && visibleStudents.every(s => selectedRows.includes(s.id))} onchange={() => toggleAllRows(visibleStudents)} aria-label="Select all visible students"/></th><th><button class="sort-button" onclick={() => sortBy('id')}>Student ID ↕</button></th><th><button class="sort-button" onclick={() => sortBy('name')}>Name ↕</button></th><th><button class="sort-button" onclick={() => sortBy('program')}>Program ↕</button></th><th><button class="sort-button" onclick={() => sortBy('year')}>Year Level ↕</button></th><th>Status</th><th>Actions</th></tr></thead><tbody>{#each visibleStudents as s}<tr><td><input type="checkbox" checked={selectedRows.includes(s.id)} onchange={() => toggleRow(s.id)} aria-label={`Select ${s.name}`}/></td><td>{s.id}</td><td><button class="table-link" onclick={() => openStudentDetails(s)}><strong>{s.name}</strong></button></td><td>{s.program}</td><td>{s.year}</td><td><span class="status approved">{s.status}</span></td><td><button class="icon-btn row-action" aria-label={`View ${s.name}`} onclick={() => openStudentDetails(s)}><Eye size={16}/></button></td></tr>{:else}<tr><td colspan="7" class="empty-table">No students match these filters.</td></tr>{/each}</tbody></table></div>
          <div class="table-footer"><span>Rows per page <select value={pageSize} onchange={changePageSize}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></span><span>{filteredStudents.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length}</span><button class="pagination" disabled={currentPage === 1} onclick={() => currentPage -= 1}><ChevronLeft size={14}/></button><span>Page {currentPage} of {Math.max(1, Math.ceil(filteredStudents.length / pageSize))}</span><button class="pagination" disabled={currentPage >= Math.ceil(filteredStudents.length / pageSize)} onclick={() => currentPage += 1}><ChevronRight size={14}/></button></div>
        </section>

      {:else if page === 'Pending Approvals' && isAdmin}
        <PageTitle icon={Clock3} title="Pending Approvals" subtitle="Review sign-up requests before granting account access." action="Approve Selected" onAction={() => { const selected = registrations.filter(item => item.status === 'Pending' && selectedRows.includes(item.id)); if (selected.length !== 1) notify('Select one pending registration to approve.'); else startRegistrationDecision(selected[0], true); }}/>
        <section class="panel approvals-panel"><div class="approval-heading"><div><h3>Teacher Registrations</h3><p>{pendingCount} registration(s) awaiting review</p></div><div class="approval-illustration"><ClipboardCheck size={78}/></div></div>{#if pendingCount}<div class="table-scroll"><table><thead><tr><th><input type="checkbox" checked={registrations.filter(r => r.status === 'Pending').length > 0 && registrations.filter(r => r.status === 'Pending').every(r => selectedRows.includes(r.id))} onchange={() => toggleAllRows(registrations.filter(r => r.status === 'Pending'))} aria-label="Select all pending registrations"/></th><th>Name</th><th>Email</th><th>Department</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{#each registrations.filter(r => r.status === 'Pending') as registration}<tr><td><input type="checkbox" checked={selectedRows.includes(registration.id)} onchange={() => toggleRow(registration.id)} aria-label={`Select ${registration.name}`}/></td><td><button class="table-link" onclick={() => openRegistration(registration)}>{registration.name}</button></td><td>{registration.email}</td><td>{registration.department}</td><td>{registration.submitted}</td><td><button class="outline-btn" onclick={() => startRegistrationDecision(registration, true)}>Approve</button> <button class="outline-btn" onclick={() => startRegistrationDecision(registration, false)}>Reject</button></td></tr>{/each}</tbody></table></div>{:else}<div class="empty-success"><span><Check size={21}/></span><div><strong>All caught up!</strong><small>There are no pending teacher registrations.</small></div></div>{/if}<div class="panel-bottom-note">Showing {pendingCount} of {registrations.length} registrations</div></section>

      {:else if page === 'Audit Log' && isAdmin}
        <PageTitle icon={FileText} title="Audit Log" subtitle="Administrative actions recorded by the system."/>
        <section class="panel table-panel"><div class="toolbar"><div class="search-field"><Search size={16}/><input id="page-search" bind:value={auditSearch} placeholder="Search action, target, or actor..."/></div><select bind:value={auditTypeFilter}><option>All actions</option>{#each [...new Set(audit.map(item => item.type))] as type}<option>{type.charAt(0) + type.slice(1).toLowerCase()}</option>{/each}</select><select bind:value={auditActorFilter}><option>All actors</option>{#each [...new Set(audit.map(item => item.action))] as actor}<option>{actor}</option>{/each}</select><input class="date-input" type="date" bind:value={auditFrom} aria-label="Filter from date"/><input class="date-input" type="date" bind:value={auditTo} aria-label="Filter to date"/><button class="outline-btn" onclick={() => exportRecords('audit-log.csv', filteredAudit)}><Download size={14}/> Export CSV</button></div><div class="table-scroll"><table><thead><tr><th>EVENT TYPE</th><th>ACTION</th><th>EVENT DETAILS</th><th>TARGET</th><th><button class="sort-button" onclick={() => sortBy('time')}>TIMESTAMP ↕</button></th></tr></thead><tbody>{#each sortRecords(filteredAudit) as a}<tr><td><span class="event-pill">{a.type}</span></td><td>{a.action}</td><td>{a.detail}</td><td>{a.target}</td><td>{a.time}</td></tr>{:else}<tr><td colspan="5" class="empty-table">No audit records match these filters.</td></tr>{/each}</tbody></table></div><div class="table-footer">Showing {filteredAudit.length} records</div></section>

      {:else if page === 'Attendance & RFID'}
        <PageTitle icon={ScanLine} title="Attendance" subtitle="Record and view student attendance." action="Take Attendance" onAction={() => document.getElementById('rfid-input')?.focus()}/>
        <section class="panel attendance-controls"><label>Select Class<select bind:value={selectedClass}>{#each classes as c}<option>{c.name}</option>{/each}</select></label><label>Section<select bind:value={attendanceSection}><option>All Sections</option>{#each selectedClassData?.sectionNames || [] as section}<option>{section}</option>{/each}</select></label><label>Date<input type="date" bind:value={selectedDate}/></label><button class="primary load-btn" onclick={() => { attendanceSearch = ''; notify(`${sectionAttendance.length} attendance record(s) loaded.`); }}> <ClipboardCheck size={15}/> Load Attendance</button></section>
        <div class="attendance-layout"><section class="rfid-card"><h3>RFID Scan Station</h3><div class="rfid-symbol"><ScanLine size={48}/></div><strong>{rfidFeedback}</strong><span class="listening"><i></i> RFID scan simulation</span><form class="rfid-scan-form" onsubmit={simulateRfidScan}><input id="rfid-input" bind:value={rfidValue} aria-label="RFID or student ID" placeholder="Enter RFID or student ID" required/><button class="primary tiny" type="submit">Scan</button></form></section><div class="attendance-right"><div class="attendance-stats"><MiniStat tone="green" icon={CheckCircle2} label="Present" value={String(presentCount)}/><MiniStat tone="pink" icon={XCircle} label="Absent" value={String(absentCount)}/><MiniStat tone="orange" icon={Clock} label="Late" value={String(lateCount)}/><MiniStat tone="violet" icon={AlertCircle} label="Excused" value={String(excusedCount)}/></div><section class="panel compact-table"><div class="panel-heading"><h3>Attendance Records</h3><button class="text-link" onclick={() => exportRecords('attendance.csv', sectionAttendance)}><Download size={13}/> Export</button></div><div class="toolbar attendance-toolbar"><div class="search-field"><Search size={14}/><input bind:value={attendanceSearch} placeholder="Search student ID or RFID..."/></div></div><div class="table-scroll"><table><thead><tr><th>Student ID</th><th>Name</th><th>Status</th><th>Time In</th><th>Remarks</th></tr></thead><tbody>{#each filteredAttendance as item}<tr><td>{item.id}</td><td>{item.name}</td><td><select class="attendance-status" value={item.status} onchange={event => requestAttendanceStatus(item, event.currentTarget.value, event)} aria-label={`Attendance status for ${item.name}`}><option>Present</option><option>Absent</option><option>Late</option><option>Excused</option></select></td><td>{item.time}</td><td><input class="remarks-input" value={item.remarks || ''} aria-label={`Remarks for ${item.name}`} onchange={event => requestAttendanceRemark(item, event.currentTarget.value, event)} placeholder="Add remarks"/></td></tr>{:else}<tr><td colspan="5" class="empty-table">No attendance records for this class, section, and date.</td></tr>{/each}</tbody></table></div></section></div></div>

      {:else if page === 'Classes & Sections'}
        <PageTitle icon={BookOpen} title="Classes & Sections" subtitle="Manage your assigned classes and sections." action="View Class Details" onAction={() => openModal('Class Details', selectedClassData, 'class-view')}/>
        <div class="tabs"><button class:chosen={selectedTab === 'My Classes'} onclick={() => selectedTab = 'My Classes'}>My Classes</button><button class:chosen={selectedTab === 'All Sections'} onclick={() => selectedTab = 'All Sections'}>All Sections</button></div>
        <div class="classes-layout"><section class="panel class-list">{#each classes as c}<button class:class-selected={selectedClass === c.name} class="class-choice" onclick={() => { selectedClass = c.name; selectedSection = 'All Sections'; }}><span><BookOpen size={19}/></span><div><strong>{c.name}</strong><small>{c.sections} sections</small></div></button>{:else}<p class="empty-inline">No classes have been assigned yet.</p>{/each}</section><section class="panel class-detail"><div class="class-detail-heading"><div><h3>{selectedClassData?.name || 'No class selected'}</h3><span class="role-pill">{selectedClassData?.sections || 0} sections</span></div></div>{#if selectedClassData}<div class="detail-grid"><div><small>Course</small><strong>{selectedClassData.course}</strong></div><div><small>Year Level</small><strong>{selectedClassData.year}</strong></div><div><small>Schedule</small><strong>{selectedClassData.schedule}</strong></div></div><div class="section-table"><div class="section-row section-header"><span>Section</span><span>Actions</span></div>{#each selectedClassData.sectionNames || [] as section}<div class="section-row"><span>{section}</span><button class="primary tiny" onclick={() => { selectedSection = section; selectedTab = 'All Sections'; }}>View Roster</button></div>{/each}</div>{#if selectedTab === 'All Sections'}<section class="roster-panel"><div class="panel-heading"><h3>{selectedSection === 'All Sections' ? 'Enrolled Students' : `${selectedSection} Roster`}</h3><div class="search-field"><Search size={14}/><input bind:value={rosterSearch} placeholder="Search roster..."/></div></div><div class="table-scroll"><table><thead><tr><th>Student ID</th><th>Name</th><th>Program</th><th>Year</th></tr></thead><tbody>{#each students.filter(student => student.className === selectedClassData.name && (selectedSection === 'All Sections' || student.section === selectedSection) && `${student.id} ${student.name}`.toLowerCase().includes(rosterSearch.toLowerCase())) as student}<tr><td>{student.id}</td><td>{student.name}</td><td>{student.program}</td><td>{student.year}</td></tr>{:else}<tr><td colspan="4" class="empty-table">No students are enrolled in this roster.</td></tr>{/each}</tbody></table></div></section>{/if}{:else}<p class="empty-inline">Select a class to view its sections.</p>{/if}</section></div>

      {:else if page === 'Reports'}
        <PageTitle icon={FileBarChart} title="Reports & Analytics" subtitle="View reports and analytics for your classes." action="Export Report" onAction={() => exportRecords(`${selectedTab.toLowerCase().replaceAll(' ', '-')}-report.csv`, selectedTab === 'Grades' || selectedTab === 'Student Performance' ? reportGrades : reportAttendance)}/>
        <div class="tabs report-tabs"><button class:chosen={selectedTab === 'Attendance'} onclick={() => selectedTab = 'Attendance'}>Attendance</button><button class:chosen={selectedTab === 'Grades'} onclick={() => selectedTab = 'Grades'}>Grades</button><button class:chosen={selectedTab === 'Student Performance'} onclick={() => selectedTab = 'Student Performance'}>Student Performance</button></div>
        <section class="panel report-filters"><label>Class<select bind:value={selectedClass}>{#each classes as classItem}<option>{classItem.name}</option>{/each}</select></label><label>Grading period<select bind:value={reportPeriod}><option>1st Semester</option><option>2nd Semester</option></select></label><label>Trend interval<select bind:value={reportFrequency}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label></section>
        {#if selectedTab === 'Attendance'}<div class="report-grid"><section class="panel chart-panel"><h3>Attendance Overview</h3><div class="donut-wrap"><div class="donut report-donut"><div><strong>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Present').length / reportAttendance.length * 100) : 0}%</strong></div></div><div class="legend"><p><i class="dot plum"></i>Present <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Present').length / reportAttendance.length * 100) : 0}%</b></p><p><i class="dot rose"></i>Absent <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Absent').length / reportAttendance.length * 100) : 0}%</b></p><p><i class="dot green"></i>Late <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Late').length / reportAttendance.length * 100) : 0}%</b></p></div></div></section><section class="panel chart-panel"><h3>Attendance by {reportFrequency.toLowerCase()}</h3>{#each attendanceTrend as group}<div class="report-data-row"><span>{group.label} · {group.total} records</span><strong>{Math.round(group.present / group.total * 100)}% present</strong></div>{:else}<p class="empty-inline">No attendance records are available for this class.</p>{/each}</section></div>
        {:else}<section class="panel table-panel"><div class="panel-heading"><h3>{selectedTab === 'Grades' ? 'Academic Records' : 'Student Performance'}</h3></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Class / Section</th><th>Quizzes</th><th>Examinations</th><th>Activities</th><th>Assessments</th><th>Average</th></tr></thead><tbody>{#each reportGrades as grade}<tr><td>{students.find(student => student.id === grade.studentId)?.name || grade.studentId}</td><td>{grade.className} / {grade.section}</td><td>{grade.quizzes}</td><td>{grade.examinations}</td><td>{grade.activities}</td><td>{grade.assessments}</td><td>{Math.round((grade.quizzes + grade.examinations + grade.activities + grade.assessments) / 4)}%</td></tr>{:else}<tr><td colspan="7" class="empty-table">No academic records are available for this class and grading period.</td></tr>{/each}</tbody></table></div></section>{/if}

      {:else if page === 'Settings'}
        <PageTitle icon={Settings} title={isAdmin ? 'Account Settings' : 'Settings'} subtitle="Manage your account profile, security credentials, and preferences."/>
        <div class="tabs settings-tabs"><button class:chosen={selectedTab === 'Profile'} onclick={() => selectedTab = 'Profile'}>Profile</button><button class:chosen={selectedTab === 'Password'} onclick={() => selectedTab = 'Password'}>Password</button><button class:chosen={selectedTab === 'Appearance'} onclick={() => selectedTab = 'Appearance'}>Appearance</button><button class:chosen={selectedTab === 'Notifications'} onclick={() => selectedTab = 'Notifications'}>Notifications</button></div>
        {#if selectedTab === 'Profile'}<section class="panel profile-settings"><div class="profile-summary"><div class="profile-avatar">{#if profilePhoto}<img src={profilePhoto} alt={`${userSettings.firstName} ${userSettings.lastName}`}/>{:else}{userSettings.firstName[0]}{userSettings.lastName[0]}{/if}</div><h3>{userSettings.firstName} {userSettings.lastName}</h3><p>{userSettings.email}</p><label class="soft-btn photo-picker">Change Photo<input type="file" accept="image/*" onchange={handlePhotoChange}/></label></div><form class="profile-form" onsubmit={saveProfile}><div class="form-heading"><h3>Profile Information</h3></div><div class="form-grid"><label>First Name<input name="firstName" value={userSettings.firstName} required/></label><label>Last Name<input name="lastName" value={userSettings.lastName} required/></label><label class="full">Email Address<input name="email" type="email" value={userSettings.email} required/></label><label class="full">Department<input name="department" value={userSettings.department} required/></label></div><div class="form-actions"><button class="primary" type="submit">Save Changes</button></div></form></section>
        {:else if selectedTab === 'Password'}<form class="panel settings-card" onsubmit={changePassword}><h3>Security & Password</h3><label>Current Password<input name="currentPassword" type="password" autocomplete="current-password" required/></label><label>New Password<input name="newPassword" type="password" minlength="8" autocomplete="new-password" required/></label><label>Confirm New Password<input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required/></label><button class="primary" type="submit">Update Password</button></form>
        {:else if selectedTab === 'Appearance'}<section class="panel settings-card"><h3>Appearance</h3><p>Choose how E-Index looks on your device.</p><div class="appearance-choice"><span><Palette size={18}/> Light theme</span><span class="status approved">{userSettings.appearance} selected</span></div><button class="primary" onclick={() => saveAppearance(userSettings.appearance === 'Light' ? 'Dark' : 'Light')}>Switch to {userSettings.appearance === 'Light' ? 'Dark' : 'Light'} theme</button></section>
        {:else}<section class="panel settings-card"><h3>Notification Preferences</h3><label class="toggle-row">Account updates <input type="checkbox" bind:checked={notificationPreferences.updates}/></label><label class="toggle-row">Attendance reminders <input type="checkbox" bind:checked={notificationPreferences.attendance}/></label><label class="toggle-row">System announcements <input type="checkbox" bind:checked={notificationPreferences.announcements}/></label><button class="primary" onclick={saveNotificationPreferences}>Save Preferences</button><hr/><h3>Demo data</h3><p>Restore the original sample records and accounts for testing.</p><button class="outline-btn" onclick={() => askConfirmation('reset-data', null, 'Reset demo data', 'This replaces all locally saved E-Index demo records with the original sample data.')}>Reset demo data</button></section>{/if}

      {:else}
        <PageTitle icon={CircleHelp} title={page} subtitle="This workspace section is ready for your connected data."/>
        <section class="panel empty-state"><div class="empty-icon"><FileText size={28}/></div><h3>No records to display yet</h3><p>Records and activity will appear here when data is available.</p><button class="soft-btn" onclick={() => notify('The page has been refreshed.')}><RefreshCw size={14}/> Refresh</button></section>
      {/if}
    </div>
  </main>
</div>
{/if}

{#if notice}<div class="toast"><CheckCircle2 size={17}/>{notice}</div>{/if}
{#if showModal}<div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading" tabindex="-1"><button class="icon-btn modal-close" aria-label="Close dialog" onclick={closeModal}><X size={18}/></button><div class="modal-symbol"><Users size={22}/></div><h2 id="modal-heading">{modalTitle}</h2>
  {#if modalMode === 'teacher-form'}<p>Teacher access is simulated locally. New accounts use the sample password Teacher123!.</p><form onsubmit={submitModalForm}><label>Full name<input name="name" value={formValues.name} required/></label><label>Staff ID<input name="id" inputmode="numeric" pattern="[0-9]+" value={formValues.id} required/></label><label>Department<input name="department" value={formValues.department} required/></label><label>Email address<input name="email" type="email" value={formValues.email} required/></label><label>Account status<select name="status" value={formValues.status}><option>Approved</option><option>Pending</option></select></label><div class="modal-actions"><button class="outline-btn" type="button" onclick={closeModal}>Cancel</button><button class="primary" type="submit">Save Teacher</button></div></form>
  {:else if modalMode === 'confirm'}<p>{formValues.detail}</p><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Cancel</button><button class="primary danger-action" onclick={runConfirmation}>Confirm</button></div>
  {:else if modalMode === 'teacher-view'}<div class="record-details"><p><strong>Staff ID</strong><span>{modalRecord.id}</span></p><p><strong>Department</strong><span>{modalRecord.department}</span></p><p><strong>Email</strong><span>{modalRecord.email}</span></p><p><strong>Role / Status</strong><span>{modalRecord.role} · {modalRecord.active === false ? 'Inactive' : modalRecord.status}</span></p></div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button><button class="primary" onclick={() => openTeacherForm(modalRecord)}>Edit Teacher</button></div>
  {:else if modalMode === 'student-view'}<div class="record-details"><p><strong>Student ID</strong><span>{modalRecord.id}</span></p><p><strong>Program / Year</strong><span>{modalRecord.program} · {modalRecord.year}</span></p><p><strong>Enrollment</strong><span>{modalRecord.status}</span></p><p><strong>Class / Section</strong><span>{modalRecord.className || '—'} · {modalRecord.section || '—'}</span></p><p><strong>RFID</strong><span>{modalRecord.rfid || 'Not assigned'}</span></p><strong>Academic records</strong>{#each grades.filter(item => item.studentId === modalRecord.id) as grade}<p><span>{grade.period} · {grade.className}</span><span>{Math.round((grade.quizzes + grade.examinations + grade.activities + grade.assessments) / 4)}% average</span></p>{:else}<p>No academic records available.</p>{/each}<strong>Recent attendance</strong>{#each attendance.filter(item => item.id === modalRecord.id).slice(0, 5) as item}<p><span>{item.date}</span><span>{item.status} · {item.time}</span></p>{:else}<p>No attendance history.</p>{/each}</div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>
  {:else if modalMode === 'registration-view'}<div class="record-details"><p><strong>Email</strong><span>{modalRecord.email}</span></p><p><strong>Department</strong><span>{modalRecord.department}</span></p><p><strong>Submitted</strong><span>{modalRecord.submitted}</span></p></div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button><button class="outline-btn" onclick={() => startRegistrationDecision(modalRecord, false)}>Reject</button><button class="primary" onclick={() => startRegistrationDecision(modalRecord, true)}>Approve</button></div>
  {:else if modalMode === 'class-view'}{#if modalRecord}<div class="record-details"><p><strong>Course</strong><span>{modalRecord.course}</span></p><p><strong>Year level</strong><span>{modalRecord.year}</span></p><p><strong>Schedule</strong><span>{modalRecord.schedule}</span></p><strong>Sections</strong>{#each modalRecord.sectionNames as section}<p><span>{section}</span><span>{students.filter(student => student.className === modalRecord.name && student.section === section).length} students</span></p>{/each}</div>{:else}<p>No class details are available.</p>{/if}<div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>
  {:else}<p>This section uses the sample E-Index data stored in this browser.</p><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>{/if}</div></div>{/if}

