<script>
  import Quick from './Quick.svelte';
  import Stat from './Stat.svelte';
  import {
    ArrowRight, BookOpen, Building2, CalendarDays, Check, ClipboardCheck,
    ClipboardList, Clock3, FileText, Users
  } from 'lucide-svelte';

  export let userSettings;
  export let classes = [];
  export let studentCount;
  export let attendanceRate;
  export let onNavigate;
</script>

<section class="hero teacher-hero">
  <div><h1>Good Afternoon, {userSettings.firstName}! <span>👋</span></h1><p>Here's a quick overview of your classes today.</p></div>
  <button class="hero-button" onclick={() => onNavigate('Classes & Sections')}>My Classes <ArrowRight size={14}/></button>
  <div class="hero-art"><Building2 size={90}/></div>
</section>
<section class="stat-grid four">
  <Stat icon={CalendarDays} tone="pink" value={classes.length} label="My Classes" note="View classes →" onClick={() => onNavigate('Classes & Sections')}/>
  <Stat icon={Users} tone="violet" value={studentCount} label="Total Students" note="View students →" onClick={() => onNavigate('Students')}/>
  <Stat icon={ClipboardList} tone="orange" value={classes.length} label="Today's Schedule" note="View schedule →" onClick={() => onNavigate('Classes & Sections')}/>
  <Stat icon={Check} tone="green" value={`${attendanceRate}%`} label="Attendance Rate" note="View details →" onClick={() => onNavigate('Reports')}/>
</section>
<div class="teacher-dash-grid">
  <section class="panel today-panel"><div class="panel-heading"><h3>Today's Classes</h3><button class="text-link" onclick={() => onNavigate('Classes & Sections')}>View all <ArrowRight size={13}/></button></div>
    {#each classes.slice(0, 3) as classItem}<div class="schedule-item"><span class="schedule-icon"><Clock3 size={17}/></span><div><small>{classItem.schedule}</small><strong>{classItem.name}</strong><small>Sections: {classItem.sectionNames.join(', ')}</small></div></div>{:else}<p class="empty-inline">No classes have been assigned yet.</p>{/each}
  </section>
  <section class="panel quick-panel"><div class="panel-heading"><h3>Quick Actions</h3></div><div class="quick-actions">
    <Quick icon={ClipboardCheck} label="Take Attendance" onClick={() => onNavigate('Attendance & RFID')}/>
    <Quick icon={Users} label="View Students" onClick={() => onNavigate('Students')}/>
    <Quick icon={FileText} label="View Reports" onClick={() => onNavigate('Reports')}/>
    <Quick icon={BookOpen} label="Manage Classes" onClick={() => onNavigate('Classes & Sections')}/>
  </div></section>
</div>
