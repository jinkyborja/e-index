<script>
  import { onMount } from 'svelte';
  import {
    authUser, restoreAuth, signIn, signOut, registerTeacher, fetchActiveColleges,
    requestPasswordReset, resetPassword
  } from './stores/auth.js';
  import MiniStat from './components/MiniStat.svelte';
  import PageTitle from './components/PageTitle.svelte';
  import AdminDashboard from './components/AdminDashboard.svelte';
  import TeacherDashboard from './components/TeacherDashboard.svelte';
  import { get } from 'svelte/store';
  import { appData, setAppData, clearAppData } from './stores/appData.js';
  import { apiRequest } from './utils/api.js';
  import { navigate, routeLocation, watchHistory } from './utils/router.js';
  import { dashboardPath, pathForPage, resolvePortalRoute } from './utils/routes.js';
  import { exportCsv } from './utils/export.js';
  import {
    LayoutDashboard, Users, GraduationCap, Clock3, ClipboardList, Activity,
    Settings, Search, Bell, ChevronDown, Menu, X, LogOut, PanelLeftClose,
    CalendarDays, Check, ArrowUpRight, ArrowRight, Plus, Download, MoreHorizontal,
    BookOpen, ScanLine, FileBarChart, UserRound, ShieldCheck,
    RefreshCw, Filter, Calendar, FileText, TrendingUp, Clock, CheckCircle2,
    XCircle, AlertCircle, Eye, EyeOff, KeyRound, Sparkles, Pencil, Trash2, ChevronLeft, ChevronRight,
    ClipboardCheck, Building2, Mail, Lock, Palette, SlidersHorizontal, Sun, Moon, Camera,
    Info, Megaphone
  } from 'lucide-svelte';

  let portal = 'auth';
  let currentUser = null;
  $: currentUser = $authUser;
  let teacherAuthenticated = false;
  let authMode = 'login';
  let authReady = false;
  let authInitError = '';
  let forgotPasswordMode = false;
  let resetPasswordMode = false;
  let resetToken = '';
  let forgotEmail = '';
  let resetPasswordValue = '';
  let resetPasswordConfirm = '';
  let loginEmail = '';
  let signupName = '';
  let signupCollegeId = '';
  let activeCollegeChoices = [];
  let collegeChoicesLoading = true;
  let collegeChoicesError = '';
  let rememberMe = false;
  let authError = '';
  let showPassword = false;
  let showCurrentSettingsPassword = false;
  let showNewSettingsPassword = false;
  let showConfirmSettingsPassword = false;
  let currentPasswordValue = '';
  let newPasswordValue = '';
  let confirmPasswordValue = '';
  let loginPassword = '';
  let signupPassword = '';
  let signupPasswordConfirm = '';
  let page = 'Dashboard';
  let sidebarOpen = false;
  let sidebarCollapsed = false;
  let searchText = '';
  let selectedTab = 'Attendance';
  let selectedClass = '';
  let selectedDate = new Date().toISOString().slice(0, 10);
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
  let reportPeriod = '';
  let reportFrequency = 'Weekly';
  let auditFrom = '';
  let auditTo = '';
  let rosterSearch = '';
  let profilePhoto = '';
  let profilePhotoInput = null;
  let teacherProfileForm = null;
  let profileEdited = false;
  let notificationPreferences = { updates: true, attendance: true, announcements: true };
  let teachers = [];
  let students = [];
  let classes = [];
  let attendance = [];
  let audit = [];
  let registrations = [];
  let colleges = [];
  let grades = [];
  let lastPath = '';

  onMount(() => {
    const stopHistory = watchHistory();
    let unsubscribe = () => {};
    let cancelled = false;
    const initialize = async () => {
      void loadCollegeChoices();
      let user = null;
      try {
        user = await restoreAuth();
      } catch {
        authInitError = 'Unable to connect to the portal. Check your connection and try again.';
      }
      if (cancelled) return;
      if (user) {
        portal = user.role;
        teacherAuthenticated = user.role === 'teacher';
        try {
          await refreshPortalData();
        } catch (error) {
          notify(error.message);
        }
      }
      if (!cancelled) {
        authReady = true;
        unsubscribe = routeLocation.subscribe(({ pathname }) => routeLocationChanged(pathname));
      }
    };
    void initialize();
    return () => {
      cancelled = true;
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
  $: if (classes.length && !classes.some(item => item.name === selectedClass)) selectedClass = classes[0].name;
  $: nameParts = (currentUser?.fullName || '').trim().split(/\s+/).filter(Boolean);
  $: teachers = $appData.teachers;
  $: students = $appData.students;
  $: classes = $appData.classes;
  $: attendance = $appData.attendance;
  $: audit = $appData.audit;
  $: registrations = $appData.registrations;
  $: colleges = $appData.colleges;
  $: grades = $appData.grades;
  $: filteredTeachers = teachers.filter(t => `${t.name} ${t.email} ${t.department} ${t.id}`.toLowerCase().includes(searchText.toLowerCase())
    && (teacherRoleFilter === 'All Roles' || t.role === teacherRoleFilter)
    && (teacherStatusFilter === 'All Statuses' || t.status === teacherStatusFilter));
  $: filteredStudents = students.filter(s => `${s.name} ${s.id} ${s.program}`.toLowerCase().includes(searchText.toLowerCase())
    && (studentProgramFilter === 'All Programs' || s.program === studentProgramFilter)
    && (studentYearFilter === 'All Year Levels' || s.year === studentYearFilter));
  $: visibleTeachers = sortRecords(filteredTeachers).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  $: visibleStudents = sortRecords(filteredStudents).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  $: teacherCount = teachers.filter(t => t.role === 'Teacher' && t.status === 'Approved' && t.active !== false).length;
  $: studentCount = students.filter(s => s.status === 'Active').length;
  $: pendingCount = registrations.filter(r => r.status === 'Pending').length;
  $: inactiveCount = teachers.filter(t => t.status === 'Inactive').length;
  $: rejectedCount = teachers.filter(t => t.status === 'Rejected').length;
  $: reportPeriods = [...new Set(grades.map(item => item.period).filter(Boolean))];
  $: if (reportPeriods.length && !reportPeriods.includes(reportPeriod)) reportPeriod = reportPeriods[0];
  $: currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  $: approvalRate = calculateApprovalRate(teachers, registrations);
  $: settingsKey = isAdmin ? 'admin' : `teacher:${currentUser?.email || 'default'}`;
  $: userSettings = $appData.settings[settingsKey] || {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
    email: currentUser?.email || '',
    department: currentUser?.department || '',
    collegeId: currentUser?.collegeId || '',
    collegeName: currentUser?.collegeName || null,
    collegeIsActive: currentUser?.collegeIsActive ?? null,
    photo: currentUser?.photo || '',
    notifications: currentUser?.notificationPreferences || { updates: true, attendance: true, announcements: true },
    appearance: currentUser?.appearance || 'Light'
  };
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
  $: passwordRequirements = {
    length: newPasswordValue.length >= 8,
    match: confirmPasswordValue.length > 0 && newPasswordValue === confirmPasswordValue
  };
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
  function selectSettingsTab(tab) {
    if (selectedTab === 'Profile' && tab !== 'Profile') {
      profileEdited = false;
      profilePhoto = userSettings.photo || '';
    }
    selectedTab = tab;
  }
  function chooseProfilePhoto() {
    profilePhotoInput?.click();
  }
  function updateProfileEdited(form) {
    if (!form) return;
    const values = new FormData(form);
    profileEdited = String(values.get('firstName') || '').trim() !== userSettings.firstName
      || String(values.get('lastName') || '').trim() !== userSettings.lastName
      || String(values.get('email') || '').trim().toLowerCase() !== userSettings.email
      || (isAdmin
        ? String(values.get('department') || '').trim() !== userSettings.department
        : String(values.get('collegeId') || '') !== (userSettings.collegeId || ''))
      || profilePhoto !== (userSettings.photo || '');
  }
  function openTeacherClass(className) {
    selectedClass = className;
    go('Classes & Sections');
  }
  function routeLocationChanged(pathname) {
    if (pathname === lastPath) return;
    lastPath = pathname;
    const user = get(authUser);

    if (pathname === '/reset-password') {
      if (user) {
        authUser.set(null);
        clearAppData();
      }
      resetToken = new URLSearchParams(window.location.search).get('token') || '';
      resetPasswordMode = true;
      forgotPasswordMode = false;
      portal = 'auth';
      teacherAuthenticated = false;
      authMode = 'login';
      return;
    }

    if (pathname === '/login') {
      if (user) {
        portal = user.role;
        navigate(dashboardPath(user.role), { replace: true });
        return;
      }
      portal = 'auth';
      page = 'Dashboard';
      setAuthMode('login');
      return;
    }

    const route = resolvePortalRoute(pathname);
    if (!route) {
      navigate(user ? dashboardPath(user.role) : '/login', { replace: true });
      return;
    }
    if (!user) {
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
  function applyAuthMode(value) {
    authMode = value;
    forgotPasswordMode = false;
    resetPasswordMode = false;
    showPassword = false;
    loginPassword = '';
    signupPassword = '';
    signupPasswordConfirm = '';
    authError = '';
  }
  function setAuthMode(value) {
    applyAuthMode(value);
  }
  async function submitForgotPassword(event) {
    event.preventDefault();
    authError = '';
    try {
      const result = await requestPasswordReset(forgotEmail.trim().toLowerCase());
      notify(result.message);
    } catch (error) {
      authError = error.message;
    }
  }
  async function submitResetPassword(event) {
    event.preventDefault();
    authError = '';
    if (resetPasswordValue !== resetPasswordConfirm) {
      authError = 'The passwords do not match.';
      return;
    }
    try {
      const result = await resetPassword(resetToken, resetPasswordValue);
      resetPasswordMode = false;
      resetToken = '';
      resetPasswordValue = '';
      resetPasswordConfirm = '';
      navigate('/login', { replace: true });
      notify(result.message);
    } catch (error) {
      authError = error.message;
    }
  }
  async function logOut() {
    try {
      await signOut();
    } catch (error) {
      notify(error.message);
      return;
    }
    clearAppData();
    portal = 'auth';
    teacherAuthenticated = false;
    rememberMe = false;
    setAuthMode('login');
    navigate('/login', { replace: true });
    notify('You have been logged out.');
  }
  async function handleTeacherAuth(event) {
    event.preventDefault();
    authInitError = '';
    if (authMode === 'signup') {
      if (signupPassword !== signupPasswordConfirm) {
        authError = 'The passwords do not match.';
        return;
      }
      try {
        await registerTeacher(signupName.trim(), loginEmail.trim().toLowerCase(), signupCollegeId, signupPassword, signupPasswordConfirm);
      } catch (error) {
        authError = authErrorMessage(error);
        return;
      }
      loginEmail = loginEmail.trim().toLowerCase();
      signupName = '';
      signupCollegeId = '';
      setAuthMode('login');
      notify('Registration submitted. An administrator must approve your account.');
      return;
    }

    const email = loginEmail.trim().toLowerCase();
    try {
      const result = await signIn(email, loginPassword, rememberMe);
      const account = result.account;
      authInitError = '';
      portal = account.role;
      teacherAuthenticated = account.role === 'teacher';
      page = 'Dashboard';
      loginPassword = '';
      showPassword = false;
      navigate(dashboardPath(account.role), { replace: true });
      let dataLoaded = true;
      try {
        await refreshPortalData();
      } catch (error) {
        dataLoaded = false;
        notify(error.message);
      }
      if (dataLoaded) notify(`Signed in to the ${account.role === 'admin' ? 'administration' : 'teacher'} portal.`);
    } catch (error) {
      authError = authErrorMessage(error);
    }
  }
  function updateAuthPassword(event) {
    authError = '';
    if (authMode === 'login') loginPassword = event.currentTarget.value;
    else signupPassword = event.currentTarget.value;
  }
  async function loadCollegeChoices() {
    collegeChoicesLoading = true;
    collegeChoicesError = '';
    try {
      const choices = await fetchActiveColleges();
      if (!Array.isArray(choices)) throw new Error('The active college list could not be loaded.');
      activeCollegeChoices = choices;
      if (!choices.some(college => college.id === signupCollegeId)) signupCollegeId = '';
    } catch (error) {
      activeCollegeChoices = [];
      collegeChoicesError = error.message || 'The active college list could not be loaded.';
    } finally {
      collegeChoicesLoading = false;
    }
  }
  async function refreshPortalData() {
    const data = await apiRequest('/api/data');
    setAppData(data);
    const key = currentUser?.role === 'admin' ? 'admin' : `teacher:${currentUser?.email || ''}`;
    const settings = data.settings?.[key];
    if (settings?.notifications) notificationPreferences = { ...settings.notifications };
  }
  async function mutatePortalData(path, options, successMessage) {
    try {
      await apiRequest(path, options);
      await refreshPortalData();
      if (successMessage) notify(successMessage);
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    }
  }
  function authErrorMessage(error) {
    const messages = {
      INVALID_CREDENTIALS: 'The email or password is incorrect.',
      ROLE_MISMATCH: 'This account cannot access the selected portal.',
      ACCOUNT_PENDING: 'This account is awaiting administrator approval.',
      ACCOUNT_INACTIVE: 'This account is inactive.',
      EMAIL_IN_USE: 'An account or registration with this email already exists.'
    };
    if (error.code === 'VALIDATION_ERROR') {
      return error.details?.[0]?.message || 'Check the registration details and try again.';
    }
    return messages[error.code] || error.message || 'The request could not be completed.';
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
    formValues = record ? { ...record } : { name: '', id: '', collegeId: '', email: '', role: 'Teacher', status: 'Approved', active: true };
    showModal = true;
  }
  function openCollegeActivation(college) {
    openModal(`Activate ${college.code}`, college, 'college-activate');
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
  async function submitModalForm(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (modalMode === 'teacher-form') {
      const email = String(values.email).trim().toLowerCase();
      const staffId = String(values.id).trim();
      if (!String(values.name).trim() || !/^\d+$/.test(staffId) || !String(values.collegeId || '').trim()) {
        notify('Enter a name, numeric staff ID, and select an active college.');
        return;
      }
      const body = {
        fullName: String(values.name).trim(),
        staffId,
        collegeId: String(values.collegeId).trim(),
        email,
        status: String(values.status).toUpperCase()
      };
      const identifier = modalRecord?.accountId || modalRecord?.id;
      const saved = await mutatePortalData(
        modalRecord ? `/api/data/teachers/${encodeURIComponent(identifier)}` : '/api/data/teachers',
        { method: modalRecord ? 'PATCH' : 'POST', body },
        modalRecord ? 'Teacher account updated.' : 'Teacher account added. A password reset email was sent.'
      );
      if (saved) closeModal();
      return;
    }
    if (modalMode === 'college-activate') {
      const saved = await mutatePortalData(
        `/api/data/colleges/${encodeURIComponent(modalRecord.id)}/activate`,
        {
          method: 'POST',
          body: {
            officialNameConfirmed: values.officialNameConfirmed === 'on',
            guiuanCampusAssignmentConfirmed: values.guiuanCampusAssignmentConfirmed === 'on',
            confirmationReference: String(values.confirmationReference || '').trim()
          }
        },
        `${modalRecord.name} activated.`
      );
      if (saved) {
        await loadCollegeChoices();
        closeModal();
      }
      return;
    }
    notify('This form is not available.');
  }
  async function runConfirmation() {
    if (!confirmation) return;
    const { type, record } = confirmation;
    if (type === 'delete-teacher' || type === 'teacher-status') {
      const active = type === 'teacher-status' && record.status !== 'Approved';
      const saved = await mutatePortalData(
        `/api/data/teachers/${encodeURIComponent(record.accountId || record.id)}/status`,
        { method: 'PATCH', body: { status: active ? 'APPROVED' : 'INACTIVE' } },
        type === 'delete-teacher' ? 'Teacher account deactivated; its records were retained.' : `Teacher account ${active ? 'activated' : 'deactivated'}.`
      );
      if (saved) {
        if (type === 'delete-teacher') selectedRows = selectedRows.filter(id => id !== record.id);
        closeModal();
      }
    } else if (type === 'attendance-status') {
      if (await saveAttendanceStatus(record, formValues.status)) closeModal();
    } else if (type === 'attendance-remark') {
      if (await saveAttendanceRemark(record, formValues.remarks)) closeModal();
    } else if (type === 'bulk-delete' || type === 'bulk-activate' || type === 'bulk-deactivate') {
      const identifiers = teachers.filter(item => record.includes(item.id)).map(item => item.accountId || item.id);
      const status = type === 'bulk-activate' ? 'APPROVED' : 'INACTIVE';
      const saved = await mutatePortalData('/api/data/teacher-bulk-status', {
        method: 'PATCH',
        body: { identifiers, status }
      }, `${record.length} selected account(s) updated.`);
      if (saved) {
        selectedRows = selectedRows.filter(id => !record.includes(id));
        closeModal();
      }
    } else if (type === 'college-deactivate') {
      const saved = await mutatePortalData(
        `/api/data/colleges/${encodeURIComponent(record.id)}/deactivate`,
        { method: 'POST' },
        `${record.name} deactivated. Existing teacher assignments were retained.`
      );
      if (saved) {
        await loadCollegeChoices();
        closeModal();
      }
    } else if (type === 'registration-approve' || type === 'registration-reject') {
      const status = type === 'registration-approve' ? 'APPROVED' : 'REJECTED';
      try {
        const result = await apiRequest(`/api/data/registrations/${encodeURIComponent(record.id)}`, {
          method: 'PATCH',
          body: { status }
        });
        closeModal();
        let refreshMessage = '';
        try {
          await refreshPortalData();
        } catch (error) {
          refreshMessage = ` Portal data could not refresh: ${error.message}`;
        }
        const emailMessage = result?.emailNotification === 'submitted'
          ? 'An email notification was submitted to the applicant.'
          : 'The decision was saved, but the applicant email could not be submitted. Please follow up with the applicant.';
        notify(`Registration ${status.toLowerCase()}. ${emailMessage}${refreshMessage}`);
      } catch (error) {
        notify(error.message);
      }
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
  async function saveAttendanceStatus(record, status) {
    return mutatePortalData(`/api/data/attendance/${encodeURIComponent(record.attendanceId)}`, {
      method: 'PATCH',
      body: { status: status.toUpperCase() }
    }, `${record.name} marked ${status.toLowerCase()}.`);
  }
  async function saveAttendanceRemark(record, remarks) {
    return mutatePortalData(`/api/data/attendance/${encodeURIComponent(record.attendanceId)}`, {
      method: 'PATCH',
      body: { remarks }
    }, 'Attendance remarks updated.');
  }
  function requestAttendanceStatus(record, status, event) {
    askConfirmation('attendance-status', record, 'Confirm attendance update', `Change ${record.name}'s status from ${record.status} to ${status}?`, { status });
    event.currentTarget.value = record.status;
  }
  function requestAttendanceRemark(record, remarks, event) {
    askConfirmation('attendance-remark', record, 'Confirm remarks update', `Save the attendance remarks for ${record.name}?`, { remarks });
    event.currentTarget.value = record.remarks || '';
  }
  async function simulateRfidScan(event) {
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
    const saved = await mutatePortalData('/api/data/attendance/scan', {
      method: 'POST',
      body: { studentId: student.id, sectionId: student.sectionId, date: selectedDate, time }
    });
    if (!saved) return;
    rfidFeedback = `${student.name} marked present at ${time}.`;
    rfidValue = '';
  }
  async function markNotificationRead(id) {
    await mutatePortalData(`/api/data/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  }
  async function markAllNotificationsRead() {
    await mutatePortalData('/api/data/notifications/read-all', { method: 'PATCH' });
  }
  function loadSettingsDraft() {
    const settings = userSettings;
    profilePhoto = settings.photo || '';
    profileEdited = false;
    notificationPreferences = { ...settings.notifications };
  }
  async function saveProfile(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const email = String(values.email).trim().toLowerCase();
    try {
      const result = await apiRequest('/api/data/profile', {
        method: 'PATCH',
        body: {
          fullName: `${String(values.firstName).trim()} ${String(values.lastName).trim()}`.trim(),
          email,
          ...(isAdmin
            ? { department: String(values.department).trim() }
            : { collegeId: String(values.collegeId || '') }),
          photo: profilePhoto || ''
        }
      });
      authUser.set({ ...currentUser, ...result.user });
      profileEdited = false;
      await refreshPortalData();
      notify('Profile changes saved.');
    } catch (error) {
      notify(error.message);
    }
  }
  function handlePhotoChange(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file for your profile photo.');
      return;
    }
    if (file.size > 2_500_000) {
      notify('Choose an image smaller than 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      profilePhoto = String(reader.result);
      updateProfileEdited(teacherProfileForm);
    };
    reader.onerror = () => notify('The selected profile image could not be read.');
    reader.readAsDataURL(file);
  }
  async function changePassword(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.newPassword !== values.confirmPassword) {
      notify('The new passwords do not match.');
      return;
    }
    try {
      const result = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword }
      });
      notify(result.message);
    } catch (error) {
      notify(error.message);
      return;
    }
    event.currentTarget.reset();
    currentPasswordValue = '';
    newPasswordValue = '';
    confirmPasswordValue = '';
    showCurrentSettingsPassword = false;
    showNewSettingsPassword = false;
    showConfirmSettingsPassword = false;
  }
  function cancelPasswordChange(event) {
    event.currentTarget.form?.reset();
    currentPasswordValue = '';
    newPasswordValue = '';
    confirmPasswordValue = '';
    showCurrentSettingsPassword = false;
    showNewSettingsPassword = false;
    showConfirmSettingsPassword = false;
  }
  async function saveNotificationPreferences() {
    await mutatePortalData('/api/data/preferences', {
      method: 'PATCH',
      body: { notificationPreferences, appearance: userSettings.appearance }
    }, 'Notification preferences saved.');
  }
  async function saveAppearance(value) {
    await mutatePortalData('/api/data/preferences', {
      method: 'PATCH',
      body: { notificationPreferences, appearance: value }
    }, `${value} appearance saved.`);
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
  <title>{portal === 'auth' ? `${authMode === 'login' ? 'Sign In' : 'Teacher Sign Up'} | E-Index` : `${page} | E-Index ${portal === 'admin' ? 'Administration' : 'Teacher Portal'}`}</title>
</svelte:head>

{#if !isAdmin && !teacherAuthenticated}
  <main class="auth-page">
    <div class="auth-shell">
    <section class="auth-story">
      <div class="auth-brand" aria-label="E-Index Academic Portal">
        <span class="auth-brand-mark">E</span>
        <span><strong>E-Index</strong><small>ACADEMIC PORTAL</small></span>
      </div>
      <div class="auth-story-content">
        <span class="auth-eyebrow"><span></span> YOUR ACADEMIC WORKSPACE</span>
        <h1><span>Make every</span><br/><span>school day <em>count.</em></span></h1>
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
      <div class="auth-panel-top"><span>E-INDEX ACCESS</span></div>
      <div class="auth-form-wrap">
        <div class="auth-card">
          <div class="auth-mobile-brand"><span class="auth-brand-mark">E</span><strong>E-Index</strong></div>
          <div class="auth-heading">
            <h2>{resetPasswordMode ? 'Choose a new password' : forgotPasswordMode ? 'Reset your password' : authMode === 'login' ? 'Welcome back' : 'Request Teacher Access'}</h2>
            <p>{resetPasswordMode ? 'Enter a new password for your E-Index account.' : forgotPasswordMode ? 'Enter your registered school email to receive a secure reset link.' : authMode === 'login' ? 'Sign in to your E-Index workspace.' : 'An administrator must approve your teacher account before you can sign in.'}</p>
          </div>
          {#if !forgotPasswordMode && !resetPasswordMode}
            <div class="auth-tabs" role="tablist" aria-label="Account access">
              <button class:auth-tab-active={authMode === 'login'} role="tab" aria-selected={authMode === 'login'} onclick={() => setAuthMode('login')}>Sign in</button>
              <button class:auth-tab-active={authMode === 'signup'} role="tab" aria-selected={authMode === 'signup'} onclick={() => setAuthMode('signup')}>Create account</button>
            </div>
          {/if}

          {#if forgotPasswordMode}
            <form class="auth-form" onsubmit={submitForgotPassword}>
              <label>School email
                <span class="auth-input-wrap"><Mail size={16}/><input type="email" autocomplete="email" bind:value={forgotEmail} placeholder="you@school.edu.ph" required/></span>
              </label>
              {#if authError}{#key authError}<p class="auth-error" role="alert">{authError}</p>{/key}{/if}
              <button class="auth-submit" type="submit">Send reset link <ArrowRight size={17}/></button>
              <button class="auth-text-button" type="button" onclick={() => { forgotPasswordMode = false; authError = ''; }}>Back to sign in</button>
            </form>
          {:else if resetPasswordMode}
            <form class="auth-form" onsubmit={submitResetPassword}>
              <label>New password
                <span class:password-visible={showPassword} class="auth-input-wrap"><Lock size={16}/><input type={showPassword ? 'text' : 'password'} autocomplete="new-password" minlength="8" bind:value={resetPasswordValue} required/><button class="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={16}/>{:else}<Eye size={16}/>{/if}</button></span>
              </label>
              <label>Confirm new password
                <span class="auth-input-wrap"><Lock size={16}/><input type="password" autocomplete="new-password" minlength="8" bind:value={resetPasswordConfirm} required/></span>
              </label>
              {#if !resetToken}<p class="auth-error" role="alert">This password reset link is invalid or has expired.</p>{/if}
              {#if authError}{#key authError}<p class="auth-error" role="alert">{authError}</p>{/key}{/if}
              <button class="auth-submit" type="submit" disabled={!resetToken}>Save new password <ArrowRight size={17}/></button>
              <button class="auth-text-button" type="button" onclick={() => { resetPasswordMode = false; navigate('/login', { replace: true }); }}>Back to sign in</button>
            </form>
          {:else}
            <form class:signup-form={authMode === 'signup'} class="auth-form" onsubmit={handleTeacherAuth}>
              {#if authMode === 'signup'}
                <label>Full Name
                  <span class="auth-input-wrap"><UserRound size={16}/><input autocomplete="name" name="name" maxlength="120" placeholder="Enter your full name" bind:value={signupName} required/></span>
                </label>
              {/if}
              <label>{authMode === 'signup' ? 'School Email Address' : 'School email'}
                <span class="auth-input-wrap"><Mail size={16}/><input type="email" autocomplete="email" name="email" maxlength="254" placeholder="Enter your school email address" bind:value={loginEmail} required/></span>
              </label>
              {#if authMode === 'signup'}
                <label>College / Department
                  <span class="auth-input-wrap"><Building2 size={16}/><select name="collegeId" bind:value={signupCollegeId} required disabled={collegeChoicesLoading || activeCollegeChoices.length === 0}><option value="" disabled>Select your college</option>{#each activeCollegeChoices as college}<option value={college.id}>{college.name}</option>{/each}</select><ChevronDown size={15}/></span>
                </label>
                {#if collegeChoicesLoading}
                  <p class="auth-helper" role="status">Loading verified college choices…</p>
                {:else if collegeChoicesError}
                  <p class="auth-error" role="alert">{collegeChoicesError}</p>
                {:else if activeCollegeChoices.length === 0}
                  <p class="auth-helper" role="status">Verified college choices are currently unavailable. Registration will open when an administrator confirms and activates a college.</p>
                {/if}
                <p class="auth-helper">Teacher access requires administrator approval before you can sign in.</p>
              {/if}
              <label>Password
                <span class:password-visible={showPassword} class="auth-input-wrap"><Lock size={16}/><input type={showPassword ? 'text' : 'password'} autocomplete={authMode === 'login' ? 'current-password' : 'new-password'} name="password" placeholder={authMode === 'login' ? 'Enter your password' : 'At least 8 characters'} minlength="8" maxlength="128" value={authMode === 'login' ? loginPassword : signupPassword} oninput={updateAuthPassword} required/><button class="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={16}/>{:else}<Eye size={16}/>{/if}</button></span>
              </label>
              {#if authMode === 'signup'}
                <label>Confirm password
                  <span class:password-visible={showPassword} class="auth-input-wrap"><Lock size={16}/><input type={showPassword ? 'text' : 'password'} autocomplete="new-password" name="password-confirm" placeholder="Re-enter your password" minlength="8" maxlength="128" bind:value={signupPasswordConfirm} oninput={() => authError = ''} required/><button class="auth-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={16}/>{:else}<Eye size={16}/>{/if}</button></span>
                </label>
              {/if}
              {#if authMode === 'login'}
                <div class="auth-form-options"><label class="auth-remember"><input type="checkbox" bind:checked={rememberMe}/> Remember me</label><button type="button" class="auth-text-button" onclick={() => { forgotEmail = loginEmail; forgotPasswordMode = true; authError = ''; }}>Forgot password?</button></div>
              {/if}
              {#if authError}{#key authError}<p class="auth-error" role="alert">{authError}</p>{/key}{/if}
              {#if authInitError}<p class="auth-error" role="alert">{authInitError}</p>{/if}
              <button class="auth-submit" type="submit" disabled={!authReady || (authMode === 'signup' && (collegeChoicesLoading || activeCollegeChoices.length === 0 || !signupCollegeId))}>{authMode === 'login' ? 'Sign in to your account' : 'Request Teacher Access'} <ArrowRight size={17}/></button>
            </form>
          {/if}
        </div>
      </div>
      <footer class="auth-panel-footer">© 2026 E-Index <span>·</span> Built for better learning</footer>
    </section>
    </div>
  </main>
{:else}
<div class:teacher-shell={!isAdmin} class:theme-dark={userSettings.appearance === 'Dark'} class="app-shell">
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
        <div class="semester-select"><CalendarDays size={14}/> AY {currentAcademicYear}<ChevronDown size={13}/></div>
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
          inactiveCount={inactiveCount}
          rejectedCount={rejectedCount}
          onNavigate={go}
        />
      {:else if page === 'Dashboard' && !isAdmin}
        <TeacherDashboard
          userSettings={userSettings}
          classes={classes}
          students={students}
          attendance={attendance}
          studentCount={studentCount}
          attendanceRate={attendanceRate}
          onNavigate={go}
          onOpenClass={openTeacherClass}
        />

      {:else if page === 'Teachers' && isAdmin}
        <PageTitle icon={Users} title="Teacher Accounts" subtitle="Review teacher access and manage account status." action="Add Teacher" onAction={() => openTeacherForm()}/>
        <section class="panel">
          <div class="panel-heading"><div><h3>College choices</h3><p>These provisional names and Guiuan Campus assignments are unverified. Activate only after confirming both.</p></div></div>
          <div class="table-scroll"><table><thead><tr><th>Code</th><th>College</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {#each colleges as college}
              <tr><td>{college.code}</td><td>{college.name}</td><td>{college.isActive ? 'Active' : 'Inactive'}</td><td>{#if college.isActive}<button class="outline-btn" onclick={() => askConfirmation('college-deactivate', college, 'Deactivate college', `Deactivate ${college.name}? Existing teacher assignments will be retained.`)}>Deactivate</button>{:else}<button class="primary tiny" onclick={() => openCollegeActivation(college)}>Confirm and activate</button>{/if}</td></tr>
            {:else}<tr><td colspan="4" class="empty-table">No college records are available.</td></tr>{/each}
          </tbody></table></div>
        </section>
        <section class="panel table-panel">
          <div class="toolbar">
            <div class="search-field"><Search size={16}/><input id="page-search" bind:value={searchText} oninput={() => currentPage = 1} placeholder="Search name, email, or staff ID..."/></div>
            <select bind:value={teacherRoleFilter} onchange={() => currentPage = 1}><option>All Roles</option><option>Teacher</option></select>
            <select bind:value={teacherStatusFilter} onchange={() => currentPage = 1}><option>All Statuses</option><option>Approved</option><option>Pending</option><option>Inactive</option><option>Rejected</option></select>
            <button class="outline-btn" onclick={() => exportRecords('teachers.csv', filteredTeachers)}>Export CSV</button>
            <select aria-label="Bulk actions" onchange={event => {
              const action = event.currentTarget.value;
              if (['activate', 'deactivate', 'delete'].includes(action)) {
                if (selectedRows.length) askConfirmation(action === 'delete' ? 'bulk-delete' : `bulk-${action}`, selectedRows, `${action === 'activate' ? 'Activate' : 'Deactivate'} selected accounts`, `Update ${selectedRows.length} selected account(s)? Existing records will be retained.`);
                else notify('Select teacher accounts before choosing a bulk action.');
              }
              event.currentTarget.value = '';
            }}>
              <option value="">Bulk Actions</option><option value="activate">Activate</option><option value="deactivate">Deactivate</option><option value="delete">Deactivate and retain records</option>
            </select>
          </div>
          <div class="table-scroll"><table><thead><tr><th><input type="checkbox" checked={visibleTeachers.length > 0 && visibleTeachers.every(t => selectedRows.includes(t.id))} onchange={() => toggleAllRows(visibleTeachers)} aria-label="Select all visible teachers"/></th><th><button class="sort-button" onclick={() => sortBy('name')}>Name ↕</button></th><th><button class="sort-button" onclick={() => sortBy('id')}>Staff ID ↕</button></th><th><button class="sort-button" onclick={() => sortBy('department')}>Department ↕</button></th><th><button class="sort-button" onclick={() => sortBy('email')}>Email ↕</button></th><th>Role</th><th><button class="sort-button" onclick={() => sortBy('status')}>Status ↕</button></th><th><button class="sort-button" onclick={() => sortBy('registered')}>Registered ↕</button></th><th>Last Login</th><th>Actions</th></tr></thead><tbody>
            {#each visibleTeachers as t}
              <tr>
                <td><input type="checkbox" checked={selectedRows.includes(t.id)} onchange={() => toggleRow(t.id)} aria-label={`Select ${t.name}`}/></td>
                <td><button class="table-link" onclick={() => openTeacherDetails(t)}><div class="name-cell"><span class="initial-badge">{t.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{t.name}</strong></div></button></td>
                <td>{t.id}</td><td>{t.collegeName || t.department}{#if t.collegeIsActive === false}<small>Inactive assignment</small>{/if}</td><td>{t.email}</td><td><span class="role-pill">{t.role}</span></td>
                <td><span class={`status ${t.status === 'Approved' ? 'approved' : 'pending'}`}>{t.status}</span></td><td>{t.registered}</td><td>{t.last}</td>
                <td><div class="row-actions">
                  <button class="icon-btn row-action" aria-label={`View ${t.name}`} onclick={() => openTeacherDetails(t)}><Eye size={16}/></button>
                  <button class="icon-btn row-action" aria-label={`Edit ${t.name}`} onclick={() => openTeacherForm(t)}><Pencil size={15}/></button>
                  <button class="icon-btn row-action" aria-label={`${t.status === 'Approved' ? 'Deactivate' : 'Activate'} ${t.name}`} onclick={() => askConfirmation('teacher-status', t, `${t.status === 'Approved' ? 'Deactivate' : 'Activate'} account`, `${t.status === 'Approved' ? 'Deactivate' : 'Activate'} ${t.name}'s account?`)}><RefreshCw size={15}/></button>
                  <button class="icon-btn row-action" aria-label={`Deactivate ${t.name} and retain records`} onclick={() => askConfirmation('delete-teacher', t, 'Deactivate teacher account', `Deactivate ${t.name}'s account? Existing records will be retained.`)}><Trash2 size={15}/></button>
                </div></td>
              </tr>
            {:else}<tr><td colspan="10" class="empty-table">No teacher accounts match these filters.</td></tr>{/each}
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
        <section class="panel approvals-panel"><div class="approval-heading"><div><h3>Teacher Registrations</h3><p>{pendingCount} registration(s) awaiting review</p></div><div class="approval-illustration"><ClipboardCheck size={78}/></div></div>{#if pendingCount}<div class="table-scroll"><table><thead><tr><th><input type="checkbox" checked={registrations.filter(r => r.status === 'Pending').length > 0 && registrations.filter(r => r.status === 'Pending').every(r => selectedRows.includes(r.id))} onchange={() => toggleAllRows(registrations.filter(r => r.status === 'Pending'))} aria-label="Select all pending registrations"/></th><th>Name</th><th>Email</th><th>College / Department</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{#each registrations.filter(r => r.status === 'Pending') as registration}<tr><td><input type="checkbox" checked={selectedRows.includes(registration.id)} onchange={() => toggleRow(registration.id)} aria-label={`Select ${registration.name}`}/></td><td><button class="table-link" onclick={() => openRegistration(registration)}>{registration.name}</button></td><td>{registration.email}</td><td>{registration.collegeName || registration.department}{#if registration.collegeIsActive === false}<small>Inactive assignment</small>{/if}</td><td>{registration.submitted}</td><td><button class="outline-btn" onclick={() => startRegistrationDecision(registration, true)}>Approve</button> <button class="outline-btn" onclick={() => startRegistrationDecision(registration, false)}>Reject</button></td></tr>{/each}</tbody></table></div>{:else}<div class="empty-success"><span><Check size={21}/></span><div><strong>All caught up!</strong><small>There are no pending teacher registrations.</small></div></div>{/if}<div class="panel-bottom-note">Showing {pendingCount} of {registrations.length} registrations</div></section>

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
        <section class="panel report-filters"><label>Class<select bind:value={selectedClass}>{#each classes as classItem}<option>{classItem.name}</option>{:else}<option value="">No classes available</option>{/each}</select></label><label>Grading period<select bind:value={reportPeriod}>{#each reportPeriods as period}<option>{period}</option>{:else}<option value="">No grading periods</option>{/each}</select></label><label>Trend interval<select bind:value={reportFrequency}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label></section>
        {#if selectedTab === 'Attendance'}<div class="report-grid"><section class="panel chart-panel"><h3>Attendance Overview</h3><div class="donut-wrap"><div class="donut report-donut"><div><strong>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Present').length / reportAttendance.length * 100) : 0}%</strong></div></div><div class="legend"><p><i class="dot plum"></i>Present <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Present').length / reportAttendance.length * 100) : 0}%</b></p><p><i class="dot rose"></i>Absent <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Absent').length / reportAttendance.length * 100) : 0}%</b></p><p><i class="dot green"></i>Late <b>{reportAttendance.length ? Math.round(reportAttendance.filter(item => item.status === 'Late').length / reportAttendance.length * 100) : 0}%</b></p></div></div></section><section class="panel chart-panel"><h3>Attendance by {reportFrequency.toLowerCase()}</h3>{#each attendanceTrend as group}<div class="report-data-row"><span>{group.label} · {group.total} records</span><strong>{Math.round(group.present / group.total * 100)}% present</strong></div>{:else}<p class="empty-inline">No attendance records are available for this class.</p>{/each}</section></div>
        {:else}<section class="panel table-panel"><div class="panel-heading"><h3>{selectedTab === 'Grades' ? 'Academic Records' : 'Student Performance'}</h3></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Class / Section</th><th>Quizzes</th><th>Examinations</th><th>Activities</th><th>Assessments</th><th>Average</th></tr></thead><tbody>{#each reportGrades as grade}<tr><td>{students.find(student => student.id === grade.studentId)?.name || grade.studentId}</td><td>{grade.className} / {grade.section}</td><td>{grade.quizzes}</td><td>{grade.examinations}</td><td>{grade.activities}</td><td>{grade.assessments}</td><td>{Math.round((grade.quizzes + grade.examinations + grade.activities + grade.assessments) / 4)}%</td></tr>{:else}<tr><td colspan="7" class="empty-table">No academic records are available for this class and grading period.</td></tr>{/each}</tbody></table></div></section>{/if}

      {:else if page === 'Settings'}
        <PageTitle icon={selectedTab === 'Notifications' ? Bell : Settings} title={isAdmin ? 'Account Settings' : 'Settings'} subtitle="Manage your account profile, security credentials, and preferences."/>
        <div class="settings-layout">
          <div class="tabs settings-tabs">
            <button class:chosen={selectedTab === 'Profile'} onclick={() => selectSettingsTab('Profile')}>Profile</button>
            <button class:chosen={selectedTab === 'Password'} onclick={() => selectSettingsTab('Password')}>Password</button>
            <button class:chosen={selectedTab === 'Appearance'} onclick={() => selectSettingsTab('Appearance')}>Appearance</button>
            <button class:chosen={selectedTab === 'Notifications'} onclick={() => selectSettingsTab('Notifications')}>Notifications</button>
          </div>
          <div class="settings-content">
            {#if selectedTab === 'Profile'}
              <section class="panel profile-settings teacher-profile-settings">
                <aside class="teacher-profile-card">
                  <span class="teacher-profile-decoration" aria-hidden="true"></span>
                  <div class="teacher-profile-avatar-wrap">
                    <div class="profile-avatar">
                      {#if profilePhoto}
                        <img src={profilePhoto} alt={`${userSettings.firstName} ${userSettings.lastName}`}/>
                      {:else}
                        {userSettings.firstName[0]}{userSettings.lastName[0]}
                      {/if}
                    </div>
                    <button class="teacher-profile-camera" type="button" aria-label="Change profile photo" onclick={chooseProfilePhoto}><Camera size={16}/></button>
                  </div>
                  <h3>{userSettings.firstName} {userSettings.lastName}</h3>
                  <p class="teacher-profile-email">{userSettings.email}</p>
                  <div class="teacher-profile-divider"></div>
                  <div class="teacher-profile-details">
                    <div><span class="teacher-profile-detail-icon"><Mail size={16}/></span><span><small>Email address</small><strong>{userSettings.email}</strong></span></div>
                    <div><span class="teacher-profile-detail-icon"><Building2 size={16}/></span><span><small>{isAdmin ? 'Department' : 'College / Department'}</small><strong>{isAdmin ? userSettings.department || 'Not set' : userSettings.collegeName || userSettings.department || 'Not set'}{!isAdmin && userSettings.collegeIsActive === false ? ' (inactive assignment)' : ''}</strong></span></div>
                    <div><span class="teacher-profile-detail-icon"><GraduationCap size={16}/></span><span><small>Role</small><strong>{isAdmin ? 'System Admin' : 'Teacher'}</strong></span></div>
                  </div>
                  <button class="soft-btn teacher-change-photo" type="button" onclick={chooseProfilePhoto}><Camera size={15}/>Change Photo</button>
                  <input bind:this={profilePhotoInput} class="teacher-profile-photo-input" type="file" accept="image/*" aria-label="Choose profile photo" onchange={handlePhotoChange}/>
                </aside>
                <form bind:this={teacherProfileForm} class="profile-form teacher-profile-form" onsubmit={saveProfile}>
                  <div class="teacher-profile-form-heading">
                    <div class="teacher-profile-form-title">
                      <span class="teacher-profile-heading-icon"><UserRound size={19}/></span>
                      <div><h3>Profile Information</h3><p>Update your personal information.</p></div>
                    </div>
                    <span class="teacher-profile-status" class:changed={profileEdited} aria-live="polite"><i></i>{profileEdited ? 'Unsaved changes' : 'Profile up to date'}</span>
                  </div>
                  <div class="form-grid">
                    <label>First Name<span class="teacher-profile-field"><UserRound size={16}/><input name="firstName" value={userSettings.firstName} required oninput={event => updateProfileEdited(event.currentTarget.form)}/></span></label>
                    <label>Last Name<span class="teacher-profile-field"><UserRound size={16}/><input name="lastName" value={userSettings.lastName} required oninput={event => updateProfileEdited(event.currentTarget.form)}/></span></label>
                    <label class="full">Email Address<span class="teacher-profile-field"><Mail size={16}/><input name="email" type="email" value={userSettings.email} required oninput={event => updateProfileEdited(event.currentTarget.form)}/></span></label>
                    <label class="full">{isAdmin ? 'Department' : 'College / Department'}<span class="teacher-profile-field"><Building2 size={16}/>{#if isAdmin}<input name="department" value={userSettings.department} required oninput={event => updateProfileEdited(event.currentTarget.form)}/>{:else}<select name="collegeId" value={userSettings.collegeId || ''} onchange={event => updateProfileEdited(event.currentTarget.form)}>{#if userSettings.collegeId && !activeCollegeChoices.some(college => college.id === userSettings.collegeId)}<option value={userSettings.collegeId}>{userSettings.collegeName || userSettings.department}{userSettings.collegeIsActive === false ? ' (inactive — existing assignment)' : ' (current assignment)'}</option>{/if}{#if !userSettings.collegeId}<option value="" disabled>Select your college</option>{/if}{#each activeCollegeChoices as college}<option value={college.id}>{college.name}</option>{/each}</select>{/if}</span></label>
                    {#if !isAdmin && collegeChoicesError}<p class="auth-error" role="alert">{collegeChoicesError}</p>{/if}
                  </div>
                  <div class="form-actions"><button class="primary" type="submit"><Check size={16}/>Save Changes</button></div>
                </form>
              </section>
              <section class="teacher-security-reminder">
                <span class="teacher-security-icon"><ShieldCheck size={21}/></span>
                <div><h3>Keep your account secure.</h3><p>Regularly update your password and review your account settings.</p></div>
                <button class="outline-btn" type="button" onclick={() => selectSettingsTab('Password')}>Change Password<ArrowRight size={15}/></button>
              </section>
            {:else if selectedTab === 'Password'}
              <section class="panel settings-password-panel">
                <form class="settings-password-form" onsubmit={changePassword}>
                  <header class="settings-password-heading">
                    <span class="settings-password-heading-icon" aria-hidden="true"><Lock size={19}/></span>
                    <div><h3>Security & Password</h3><p>Update your password to keep your account secure.</p></div>
                  </header>
                  <label class="settings-password-label">Current Password
                    <span class="settings-password-input">
                      <Lock size={17} aria-hidden="true"/>
                      <input name="currentPassword" type={showCurrentSettingsPassword ? 'text' : 'password'} autocomplete="current-password" bind:value={currentPasswordValue} placeholder="Enter your current password" required/>
                      <button class="settings-password-visibility" type="button" aria-label={showCurrentSettingsPassword ? 'Hide current password' : 'Show current password'} aria-pressed={showCurrentSettingsPassword} onclick={() => showCurrentSettingsPassword = !showCurrentSettingsPassword}>
                        {#if showCurrentSettingsPassword}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                      </button>
                    </span>
                  </label>
                  <label class="settings-password-label">New Password
                    <span class="settings-password-input">
                      <KeyRound size={17} aria-hidden="true"/>
                      <input name="newPassword" type={showNewSettingsPassword ? 'text' : 'password'} minlength="8" autocomplete="new-password" bind:value={newPasswordValue} placeholder="Create a strong password" required/>
                      <button class="settings-password-visibility" type="button" aria-label={showNewSettingsPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showNewSettingsPassword} onclick={() => showNewSettingsPassword = !showNewSettingsPassword}>
                        {#if showNewSettingsPassword}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                      </button>
                    </span>
                  </label>
                  <label class="settings-password-label">Confirm New Password
                    <span class="settings-password-input">
                      <KeyRound size={17} aria-hidden="true"/>
                      <input name="confirmPassword" type={showConfirmSettingsPassword ? 'text' : 'password'} minlength="8" autocomplete="new-password" bind:value={confirmPasswordValue} placeholder="Re-enter your new password" required/>
                      <button class="settings-password-visibility" type="button" aria-label={showConfirmSettingsPassword ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmSettingsPassword} onclick={() => showConfirmSettingsPassword = !showConfirmSettingsPassword}>
                        {#if showConfirmSettingsPassword}<EyeOff size={17}/>{:else}<Eye size={17}/>{/if}
                      </button>
                    </span>
                  </label>
                  <div class="settings-password-requirements" aria-live="polite">
                    <span class="settings-password-requirements-icon" aria-hidden="true"><ShieldCheck size={19}/></span>
                    <div>
                      <strong>Password requirements</strong>
                      <p>Use at least 8 characters and repeat your new password exactly.</p>
                      <ul>
                        <li class:met={passwordRequirements.length}><span>{#if passwordRequirements.length}<Check size={12}/>{/if}</span>At least 8 characters</li>
                        <li class:met={passwordRequirements.match}><span>{#if passwordRequirements.match}<Check size={12}/>{/if}</span>New passwords match</li>
                      </ul>
                    </div>
                  </div>
                  <div class="settings-password-actions">
                    <button class="primary" type="submit"><Lock size={16}/>Update Password</button>
                    <button class="outline-btn" type="button" onclick={cancelPasswordChange}>Cancel</button>
                  </div>
                </form>
                <aside class="settings-password-illustration">
                  <div class="settings-security-art" aria-hidden="true">
                    <span class="settings-security-orbit"></span>
                    <span class="settings-security-sparkle sparkle-one"><Sparkles size={20}/></span>
                    <span class="settings-security-sparkle sparkle-two"><Sparkles size={15}/></span>
                    <div class="settings-security-shield"><ShieldCheck size={88}/></div>
                    <span class="settings-security-lock"><Lock size={28}/></span>
                  </div>
                  <h3>Your Security Matters</h3>
                  <p>Keep your account safe and secure with a strong password.</p>
                  <span class="settings-security-note"><ShieldCheck size={14}/>Private to your account</span>
                </aside>
              </section>
            {:else if selectedTab === 'Appearance'}
              <section class="panel settings-card settings-appearance">
                <div class="appearance-heading">
                  <span class="appearance-icon" aria-hidden="true"><Palette size={20}/></span>
                  <div class="appearance-heading-copy">
                    <h3>Appearance</h3>
                    <p>Choose how E-Index looks on your device.</p>
                  </div>
                  <span class="appearance-status status approved"><CheckCircle2 size={15}/>{userSettings.appearance} selected</span>
                </div>
                <div class="theme-options" role="radiogroup" aria-label="Choose a theme">
                  <button
                    class="theme-option"
                    class:selected={userSettings.appearance === 'Light'}
                    type="button"
                    role="radio"
                    aria-checked={userSettings.appearance === 'Light'}
                    onclick={() => saveAppearance('Light')}
                  >
                    <span class="theme-radio" aria-hidden="true">{#if userSettings.appearance === 'Light'}<Check size={13}/>{/if}</span>
                    <span class="theme-option-copy">
                      <span class="theme-option-title"><Sun size={18}/><strong>Light Theme</strong></span>
                      <small>A clean and bright interface for everyday use.</small>
                    </span>
                    <span class="theme-preview theme-preview-light" aria-hidden="true">
                      <span class="preview-sidebar"><i></i><i></i><i></i><i></i></span>
                      <span class="preview-content">
                        <span class="preview-toolbar"><i></i><i></i><i></i></span>
                        <span class="preview-feature"></span>
                        <span class="preview-cards"><i></i><i></i></span>
                      </span>
                    </span>
                  </button>
                  <button
                    class="theme-option"
                    class:selected={userSettings.appearance === 'Dark'}
                    type="button"
                    role="radio"
                    aria-checked={userSettings.appearance === 'Dark'}
                    onclick={() => saveAppearance('Dark')}
                  >
                    <span class="theme-radio" aria-hidden="true">{#if userSettings.appearance === 'Dark'}<Check size={13}/>{/if}</span>
                    <span class="theme-option-copy">
                      <span class="theme-option-title"><Moon size={18}/><strong>Dark Theme</strong></span>
                      <small>A sleek and easy-on-the-eyes interface.</small>
                    </span>
                    <span class="theme-preview theme-preview-dark" aria-hidden="true">
                      <span class="preview-sidebar"><i></i><i></i><i></i><i></i></span>
                      <span class="preview-content">
                        <span class="preview-toolbar"><i></i><i></i><i></i></span>
                        <span class="preview-feature"></span>
                        <span class="preview-cards"><i></i><i></i></span>
                      </span>
                    </span>
                  </button>
                </div>
                <button class="primary appearance-switch" type="button" onclick={() => saveAppearance(userSettings.appearance === 'Light' ? 'Dark' : 'Light')}>
                  <RefreshCw size={16}/>
                  Switch to {userSettings.appearance === 'Light' ? 'Dark' : 'Light'} Theme
                </button>
              </section>
            {:else}
              <section class="panel settings-card settings-notifications">
                <div class="notifications-intro">
                  <div class="notifications-illustration" aria-hidden="true">
                    <Bell size={30}/>
                    <span><i></i></span>
                  </div>
                  <div class="notifications-intro-copy">
                    <span class="notification-eyebrow">Notification Preferences</span>
                    <h3>Stay informed and never miss important updates.</h3>
                    <p>Choose what kind of updates you want to receive.</p>
                  </div>
                </div>
                <div class="notification-options">
                  <article class="notification-card">
                    <div class="notification-card-heading">
                      <div class="notification-card-copy">
                        <span class="notification-type-icon"><RefreshCw size={18}/></span>
                        <div>
                          <h4>Account Updates</h4>
                          <p>System maintenance and account changes.</p>
                        </div>
                      </div>
                      <label class="notification-toggle">
                        <input type="checkbox" aria-label="Account Updates" bind:checked={notificationPreferences.updates}/>
                        <span class="notification-toggle-track" aria-hidden="true"><span></span></span>
                      </label>
                    </div>
                    <div class="notification-card-info"><Info size={15}/><span>You'll be notified about important account updates.</span></div>
                  </article>
                  <article class="notification-card">
                    <div class="notification-card-heading">
                      <div class="notification-card-copy">
                        <span class="notification-type-icon"><CalendarDays size={18}/></span>
                        <div>
                          <h4>Attendance Reminders</h4>
                          <p>Daily attendance reminders.</p>
                        </div>
                      </div>
                      <label class="notification-toggle">
                        <input type="checkbox" aria-label="Attendance Reminders" bind:checked={notificationPreferences.attendance}/>
                        <span class="notification-toggle-track" aria-hidden="true"><span></span></span>
                      </label>
                    </div>
                    <div class="notification-card-info"><Info size={15}/><span>Get reminded about attendance deadlines.</span></div>
                  </article>
                  <article class="notification-card">
                    <div class="notification-card-heading">
                      <div class="notification-card-copy">
                        <span class="notification-type-icon"><Megaphone size={18}/></span>
                        <div>
                          <h4>System Announcements</h4>
                          <p>Important news and updates.</p>
                        </div>
                      </div>
                      <label class="notification-toggle">
                        <input type="checkbox" aria-label="System Announcements" bind:checked={notificationPreferences.announcements}/>
                        <span class="notification-toggle-track" aria-hidden="true"><span></span></span>
                      </label>
                    </div>
                    <div class="notification-card-info"><Info size={15}/><span>Receive announcements from the administration.</span></div>
                  </article>
                </div>
                <div class="notification-actions">
                  <div class="notification-footer-note"><Info size={16}/><span>You can change these preferences anytime.</span></div>
                  <button class="primary" onclick={saveNotificationPreferences}><Check size={16}/> Save Preferences</button>
                </div>
              </section>
            {/if}
          </div>
        </div>

      {:else}
        <PageTitle icon={CircleHelp} title={page} subtitle="This workspace section is ready for your connected data."/>
        <section class="panel empty-state"><div class="empty-icon"><FileText size={28}/></div><h3>No records to display yet</h3><p>Records and activity will appear here when data is available.</p><button class="soft-btn" onclick={() => notify('The page has been refreshed.')}><RefreshCw size={14}/> Refresh</button></section>
      {/if}
    </div>
  </main>
</div>
{/if}

{#if notice}<div class="toast"><CheckCircle2 size={17}/>{notice}</div>{/if}
{#if showModal}<div class:admin-modal={isAdmin} class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && closeModal()}><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading" tabindex="-1"><button class="icon-btn modal-close" aria-label="Close dialog" onclick={closeModal}><X size={18}/></button><div class="modal-symbol"><Users size={22}/></div><h2 id="modal-heading">{modalTitle}</h2>
  {#if modalMode === 'teacher-form'}<p>{modalRecord ? 'Update the teacher profile and access status.' : 'A secure password setup link will be sent to the teacher email.'}</p><form onsubmit={submitModalForm}><label>Full name<input name="name" value={formValues.name} required/></label><label>Staff ID<input name="id" inputmode="numeric" pattern="[0-9]+" value={formValues.id} required/></label><label>College / Department<select name="collegeId" value={formValues.collegeId || ''} required disabled={collegeChoicesLoading || (activeCollegeChoices.length === 0 && !formValues.collegeId)}>{#if formValues.collegeId && !activeCollegeChoices.some(college => college.id === formValues.collegeId)}<option value={formValues.collegeId}>{formValues.collegeName || formValues.department}{formValues.collegeIsActive === false ? ' (inactive — existing assignment)' : ' (current assignment)'}</option>{/if}<option value="" disabled>Select your college</option>{#each activeCollegeChoices as college}<option value={college.id}>{college.name}</option>{/each}</select></label>{#if collegeChoicesError}<p class="auth-error" role="alert">{collegeChoicesError}</p>{/if}<label>Email address<input name="email" type="email" value={formValues.email} required/></label><label>Account status<select name="status" value={formValues.status}><option>Approved</option><option>Pending</option></select></label><div class="modal-actions"><button class="outline-btn" type="button" onclick={closeModal}>Cancel</button><button class="primary" type="submit">Save Teacher</button></div></form>
  {:else if modalMode === 'college-activate'}<p>These entries are provisional. Confirm the official name and Guiuan Campus assignment before activation; these attestations are not independent verification.</p><form onsubmit={submitModalForm}><label><input type="checkbox" name="officialNameConfirmed" required/> I confirm the official college name.</label><label><input type="checkbox" name="guiuanCampusAssignmentConfirmed" required/> I confirm this college is assigned to Guiuan Campus.</label><label>Confirmation reference<input name="confirmationReference" maxlength="500" required placeholder="Official source or confirmation reference"/></label><div class="modal-actions"><button class="outline-btn" type="button" onclick={closeModal}>Cancel</button><button class="primary" type="submit">Activate College</button></div></form>
  {:else if modalMode === 'confirm'}<p>{formValues.detail}</p><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Cancel</button><button class="primary danger-action" onclick={runConfirmation}>Confirm</button></div>
  {:else if modalMode === 'teacher-view'}<div class="record-details"><p><strong>Staff ID</strong><span>{modalRecord.id}</span></p><p><strong>College / Department</strong><span>{modalRecord.collegeName || modalRecord.department}{modalRecord.collegeIsActive === false ? ' (inactive assignment)' : ''}</span></p><p><strong>Email</strong><span>{modalRecord.email}</span></p><p><strong>Role / Status</strong><span>{modalRecord.role} · {modalRecord.status}</span></p></div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button><button class="primary" onclick={() => openTeacherForm(modalRecord)}>Edit Teacher</button></div>
  {:else if modalMode === 'student-view'}<div class="record-details"><p><strong>Student ID</strong><span>{modalRecord.id}</span></p><p><strong>Program / Year</strong><span>{modalRecord.program} · {modalRecord.year}</span></p><p><strong>Enrollment</strong><span>{modalRecord.status}</span></p><p><strong>Class / Section</strong><span>{modalRecord.className || '—'} · {modalRecord.section || '—'}</span></p><p><strong>RFID</strong><span>{modalRecord.rfid || 'Not assigned'}</span></p><strong>Academic records</strong>{#each grades.filter(item => item.studentId === modalRecord.id) as grade}<p><span>{grade.period} · {grade.className}</span><span>{Math.round((grade.quizzes + grade.examinations + grade.activities + grade.assessments) / 4)}% average</span></p>{:else}<p>No academic records available.</p>{/each}<strong>Recent attendance</strong>{#each attendance.filter(item => item.id === modalRecord.id).slice(0, 5) as item}<p><span>{item.date}</span><span>{item.status} · {item.time}</span></p>{:else}<p>No attendance history.</p>{/each}</div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>
  {:else if modalMode === 'registration-view'}<div class="record-details"><p><strong>Email</strong><span>{modalRecord.email}</span></p><p><strong>College / Department</strong><span>{modalRecord.collegeName || modalRecord.department}{modalRecord.collegeIsActive === false ? ' (inactive assignment)' : ''}</span></p><p><strong>Submitted</strong><span>{modalRecord.submitted}</span></p></div><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button><button class="outline-btn" onclick={() => startRegistrationDecision(modalRecord, false)}>Reject</button><button class="primary" onclick={() => startRegistrationDecision(modalRecord, true)}>Approve</button></div>
  {:else if modalMode === 'class-view'}{#if modalRecord}<div class="record-details"><p><strong>Course</strong><span>{modalRecord.course}</span></p><p><strong>Year level</strong><span>{modalRecord.year}</span></p><p><strong>Schedule</strong><span>{modalRecord.schedule}</span></p><strong>Sections</strong>{#each modalRecord.sectionNames as section}<p><span>{section}</span><span>{students.filter(student => student.className === modalRecord.name && student.section === section).length} students</span></p>{/each}</div>{:else}<p>No class details are available.</p>{/if}<div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>
  {:else}<p>No additional details are available for this record.</p><div class="modal-actions"><button class="outline-btn" onclick={closeModal}>Close</button></div>{/if}</div></div>{/if}

