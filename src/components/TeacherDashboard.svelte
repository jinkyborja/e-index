<script>
  import Quick from './Quick.svelte';
  import Stat from './Stat.svelte';
  import {
    ArrowRight, BookOpen, Calculator, CalendarDays, Check, CheckCircle2, ClipboardCheck,
    Clock3, FlaskConical, Laptop, Network, FileText, GraduationCap, Sparkles, Users,
    XCircle, Zap, Megaphone
  } from 'lucide-svelte';

  export let userSettings;
  export let classes = [];
  export let students = [];
  export let attendance = [];
  export let studentCount = 0;
  export let attendanceRate = 0;
  export let demoMode = false;
  export let gradingTasks = [];
  export let upcomingExams = [];
  export let announcements = [];
  export let onNavigate;
  export let onOpenClass;

  const weekdays = [
    { code: 'M', name: 'Monday', short: 'Mon' },
    { code: 'T', name: 'Tuesday', short: 'Tue' },
    { code: 'W', name: 'Wednesday', short: 'Wed' },
    { code: 'Th', name: 'Thursday', short: 'Thu' },
    { code: 'F', name: 'Friday', short: 'Fri' },
    { code: 'Sa', name: 'Saturday', short: 'Sat' },
    { code: 'Su', name: 'Sunday', short: 'Sun' }
  ];

  function createCurrentWeek() {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return weekdays.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return { ...day, date, isToday: date.toDateString() === now.toDateString() };
    });
  }

  function timeOrder(value, fallback = Number.MAX_SAFE_INTEGER) {
    const match = String(value || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return fallback;
    const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hour * 60 + Number(match[2] || 0);
  }

  function buildWeeklySchedule(classRecords, week) {
    const dayIndexes = Object.fromEntries(weekdays.map((day, index) => [day.code, index]));
    return classRecords.flatMap(classItem => {
      const match = String(classItem.schedule || '').trim().match(/^([A-Za-z]+)\s+(.+)$/);
      if (!match) return [];
      const codes = match[1].match(/Th|Sa|Su|M|T|W|F/g) || [];
      if (!codes.length || codes.join('') !== match[1]) return [];
      const sections = Array.isArray(classItem.sectionNames) ? classItem.sectionNames : [];
      return codes.map(code => {
        const day = week[dayIndexes[code]];
        if (!day) return null;
        const visual = getCourseVisual(classItem);
        return {
          dayCode: code,
          day,
          time: match[2],
          courseName: classItem.course || classItem.name,
          className: classItem.name,
          sections: sections.length ? sections.join(', ') : 'No sections listed',
          tone: visual.tone
        };
      }).filter(Boolean);
    }).sort((a, b) => dayIndexes[a.dayCode] - dayIndexes[b.dayCode] || timeOrder(a.time) - timeOrder(b.time));
  }

  function getCourseVisual(classItem) {
    const subject = `${classItem.course || ''} ${classItem.name || ''}`.toLowerCase();
    if (/math|algebra|calculus|geometry|statistics/.test(subject)) return { icon: Calculator, tone: 'math' };
    if (/information technology|\bit\b|network|cybersecurity/.test(subject)) return { icon: Network, tone: 'technology' };
    if (/\bcomp\b|computer|software|programming|coding/.test(subject)) return { icon: Laptop, tone: 'technology' };
    if (/science|biology|chemistry|physics/.test(subject)) return { icon: FlaskConical, tone: 'general' };
    return { icon: BookOpen, tone: 'general' };
  }

  function formatDate(date, options) {
    return date.toLocaleDateString('en-US', options);
  }

  const weekDays = createCurrentWeek();
  const weekRange = `${formatDate(weekDays[0].date, { month: 'short', day: 'numeric' })} – ${formatDate(weekDays[6].date, { month: 'short', day: 'numeric' })}`;
  $: classCards = classes.map(classItem => ({
    ...classItem,
    ...getCourseVisual(classItem),
    courseTitle: classItem.course || classItem.name,
    enrolledCount: students.filter(student => student.className === classItem.name && student.status === 'Active').length,
    sectionNames: Array.isArray(classItem.sectionNames) ? classItem.sectionNames : []
  }));
  $: weeklySchedule = buildWeeklySchedule(classes, weekDays);
  $: todayScheduleCount = weeklySchedule.filter(item => item.day.isToday).length;
  $: presentAttendanceCount = attendance.filter(item => item.status === 'Present').length;
  $: attendanceSummary = attendance.length
    ? `${presentAttendanceCount} of ${attendance.length} attendance records marked present`
    : 'No attendance records yet';
  $: recentAttendance = [...attendance]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || timeOrder(b.time, -1) - timeOrder(a.time, -1))
    .slice(0, 4);
</script>

<section class="hero teacher-hero">
  <div class="teacher-hero-copy">
    <h1>Good Afternoon, {userSettings.firstName}! <span aria-hidden="true">👋</span></h1>
    <p>Here's a quick overview of your classes today.</p>
  </div>
  <button class="hero-button" onclick={() => onNavigate('Classes & Sections')}>My Classes <ArrowRight size={15}/></button>
  <div class="teacher-hero-art" aria-hidden="true">
    <span class="hero-art-book"><BookOpen size={45}/></span>
    <span class="hero-art-cap"><GraduationCap size={43}/></span>
    <Sparkles class="hero-art-sparkle" size={18}/>
  </div>
</section>

<section class="stat-grid four teacher-stat-grid" aria-label="Dashboard overview">
  <Stat icon={BookOpen} iconSize={22} badgeIcon={Check} decorationIcon={BookOpen} tone="pink" value={classes.length} label="My Classes" note="View Classes →" onClick={() => onNavigate('Classes & Sections')}/>
  <Stat icon={Users} iconSize={22} badgeIcon={GraduationCap} decorationIcon={GraduationCap} tone="violet" value={studentCount} label="Total Students" note="View Students →" onClick={() => onNavigate('Students')}/>
  {#if demoMode}
    <Stat icon={Clock3} iconSize={22} badgeIcon={CalendarDays} decorationIcon={CalendarDays} tone="orange" value={gradingTasks.length} label="Pending Tasks" note="Review grades →" onClick={() => onNavigate('Reports')}/>
  {:else}
    <Stat icon={Clock3} iconSize={22} badgeIcon={CalendarDays} decorationIcon={CalendarDays} tone="orange" value={todayScheduleCount} label="Today's Schedule" note="View Schedule →" onClick={() => onNavigate('Classes & Sections')}/>
  {/if}
  <Stat
    icon={ClipboardCheck}
    iconSize={22}
    badgeIcon={CheckCircle2}
    decorationIcon={CheckCircle2}
    tone="green"
    value={`${attendanceRate}%`}
    label="Attendance Rate"
    note="View Details →"
    context={attendanceSummary}
    progress={attendanceRate}
    onClick={() => onNavigate('Reports')}
  />
</section>

<section class="panel teacher-dashboard-section teacher-classes-panel">
  <div class="teacher-section-heading">
    <div class="teacher-section-title">
      <span class="teacher-section-icon"><BookOpen size={20}/></span>
      <div>
        <h2>My Classes</h2>
        <p>{classes.length} assigned {classes.length === 1 ? 'class' : 'classes'}</p>
      </div>
    </div>
    <button class="text-link" onclick={() => onNavigate('Classes & Sections')}>View All Classes <ArrowRight size={14}/></button>
  </div>
  {#if classCards.length}
    <div class="teacher-class-grid">
      {#each classCards as classItem}
        <button
          class={`teacher-class-card ${classItem.tone}`}
          type="button"
          aria-label={`Open ${classItem.name}, ${classItem.enrolledCount} active ${classItem.enrolledCount === 1 ? 'student' : 'students'}`}
          onclick={() => onOpenClass(classItem.name)}
        >
          <span class={`teacher-class-art ${classItem.tone}`} aria-hidden="true">
            <svelte:component this={classItem.icon} size={34}/>
            <i></i>
          </span>
          <span class="teacher-class-copy">
            <strong>{classItem.courseTitle}</strong>
            <small>{classItem.year || 'Year level not listed'}{classItem.sectionNames.length ? ` · ${classItem.sectionNames[0]}` : ''}</small>
            <span class="teacher-student-badge"><Users size={13}/>{classItem.enrolledCount} {classItem.enrolledCount === 1 ? 'Student' : 'Students'}</span>
          </span>
          <span class="teacher-class-arrow" aria-hidden="true"><ArrowRight size={16}/></span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="teacher-dashboard-empty">
      <span><BookOpen size={24}/></span>
      <strong>No classes assigned yet</strong>
      <p>Your assigned classes will appear here.</p>
      <button class="soft-btn" onclick={() => onNavigate('Classes & Sections')}>Manage Classes</button>
    </div>
  {/if}
</section>

<section class="panel teacher-dashboard-section teacher-week-panel">
  <div class="teacher-section-heading">
    <div class="teacher-section-title">
      <span class="teacher-section-icon schedule"><CalendarDays size={20}/></span>
      <div>
        <h2>This Week's Schedule</h2>
        <p>{weekRange} · recurring class times</p>
      </div>
    </div>
    <button class="text-link" onclick={() => onNavigate('Classes & Sections')}>View Full Schedule <ArrowRight size={14}/></button>
  </div>
  {#if weeklySchedule.length}
    <div class="teacher-week-grid">
      {#each weekDays as day}
        <article class:today={day.isToday} class="teacher-week-day">
          <div class="teacher-week-day-heading">
            <span>{day.short}</span>
            <strong>{day.date.getDate()}</strong>
            {#if day.isToday}<small>Today</small>{/if}
          </div>
          <div class="teacher-week-day-classes">
            {#each weeklySchedule.filter(item => item.dayCode === day.code) as item}
              <div class={`teacher-week-class ${item.tone}`}>
                <span class="teacher-week-class-dot"></span>
                <strong>{item.courseName}</strong>
                <small>{item.time}</small>
                <small>{item.sections}</small>
              </div>
            {:else}
              <p class="teacher-empty-day">No classes scheduled</p>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="teacher-dashboard-empty compact">
      <span><CalendarDays size={24}/></span>
      <strong>No schedule records available</strong>
      <p>Add class meeting times to see your weekly schedule.</p>
      <button class="soft-btn" onclick={() => onNavigate('Classes & Sections')}>Manage Classes</button>
    </div>
  {/if}
</section>

<div class="teacher-dash-grid teacher-dashboard-bottom">
  <section class="panel quick-panel">
    <div class="quick-panel-heading">
      <span class="quick-heading-icon" aria-hidden="true"><Zap size={21}/></span>
      <div class="quick-heading-copy">
        <h3>Quick Actions</h3>
        <p>Access your most common tasks with ease.</p>
      </div>
    </div>
    <div class="quick-actions">
      <Quick icon={ClipboardCheck} label="Take Attendance" description="Mark your class attendance." onClick={() => onNavigate('Attendance & RFID')}/>
      <Quick icon={Users} label="View Students" description="Browse student records." onClick={() => onNavigate('Students')}/>
      <Quick icon={BookOpen} label="Manage Classes" description="View your assigned classes." onClick={() => onNavigate('Classes & Sections')}/>
      <Quick icon={FileText} label="Generate Reports" description="Review class performance." onClick={() => onNavigate('Reports')}/>
    </div>
  </section>

  <section class="panel recent-attendance-panel">
    <div class="teacher-section-heading">
      <div class="teacher-section-title">
        <span class="teacher-section-icon activity"><Clock3 size={19}/></span>
        <div>
          <h2>Recent Attendance</h2>
          <p>Latest recorded student check-ins</p>
        </div>
      </div>
      <button class="text-link" onclick={() => onNavigate('Attendance & RFID')}>View All <ArrowRight size={14}/></button>
    </div>
    {#if recentAttendance.length}
      <div class="teacher-activity-list">
        {#each recentAttendance as item}
          <div class="teacher-activity-item">
            <span class={`teacher-activity-marker ${item.status.toLowerCase()}`}>
              {#if item.status === 'Absent'}<XCircle size={14}/>{:else if item.status === 'Late'}<Clock3 size={14}/>{:else}<Check size={14}/>{/if}
            </span>
            <div class="teacher-activity-copy">
              <strong>{item.name}</strong>
              <small>{item.className} · {item.section}</small>
              <small>{item.date} · {item.time}</small>
            </div>
            <span class={`teacher-attendance-status ${item.status.toLowerCase()}`}>{item.status}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="teacher-dashboard-empty compact">
        <span><Clock3 size={22}/></span>
        <strong>No recent attendance</strong>
        <p>Attendance updates will appear here after you record them.</p>
        <button class="soft-btn" onclick={() => onNavigate('Attendance & RFID')}>Take Attendance</button>
      </div>
    {/if}
  </section>
</div>

{#if demoMode}
  <section class="demo-teacher-information-grid" aria-label="Academic updates and tasks">
    <section class="panel demo-detail-panel">
      <div class="panel-heading"><h3><ClipboardCheck size={17}/> Pending Grading Tasks</h3><button class="text-link" onclick={() => onNavigate('Reports')}>Open grades <ArrowRight size={13}/></button></div>
      <div class="demo-list">
        {#each gradingTasks as task}
          <article class="demo-list-item"><span class="demo-list-icon task"><FileText size={16}/></span><div><strong>{task.title}</strong><small>{task.className} · {task.section}</small></div><span class="demo-list-meta">Due {task.dueDate}</span></article>
        {:else}
          <p class="empty-inline">No grading tasks are pending.</p>
        {/each}
      </div>
    </section>
    <section class="panel demo-detail-panel">
      <div class="panel-heading"><h3><CalendarDays size={17}/> Upcoming Examinations</h3><button class="text-link" onclick={() => onNavigate('Classes & Sections')}>View classes <ArrowRight size={13}/></button></div>
      <div class="demo-list">
        {#each upcomingExams as exam}
          <article class="demo-list-item"><span class="demo-list-icon exam"><CalendarDays size={16}/></span><div><strong>{exam.title}</strong><small>{exam.className} · {exam.section}</small></div><span class="demo-list-meta">{exam.date}<small>{exam.time}</small></span></article>
        {:else}
          <p class="empty-inline">No upcoming examinations are scheduled.</p>
        {/each}
      </div>
    </section>
    <section class="panel demo-detail-panel demo-announcements-panel">
      <div class="panel-heading"><h3><Megaphone size={17}/> Announcements</h3><span class="demo-year-label">AY 2026–2027</span></div>
      <div class="demo-list">
        {#each announcements as announcement}
          <article class="demo-announcement"><div><strong>{announcement.title}</strong><small>{announcement.detail}</small></div><time>{announcement.date}</time></article>
        {:else}
          <p class="empty-inline">No announcements are available.</p>
        {/each}
      </div>
    </section>
  </section>
{/if}
