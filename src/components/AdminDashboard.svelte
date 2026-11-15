<script>
  import Stat from './Stat.svelte';
  import {
    Activity, ArrowRight, BookOpen, Building2, CalendarDays, Check, ClipboardCheck,
    CircleHelp, Clock3, GraduationCap, Users
  } from 'lucide-svelte';

  export let userSettings;
  export let teacherCount;
  export let totalTeacherCount = teacherCount;
  export let studentCount;
  export let pendingCount;
  export let approvalRate;
  export let inactiveCount = 0;
  export let rejectedCount = 0;
  export let activeCollegeCount = 0;
  export let activeClassCount = 0;
  export let systemUserCount = 0;
  export let academicYear;
  export let demoMode = false;
  export let attendance = [];
  export let audit = [];
  export let onNavigate;

  $: pendingAccountCount = demoMode
    ? Math.max(0, totalTeacherCount - teacherCount - inactiveCount - rejectedCount)
    : pendingCount;
  $: totalAccounts = demoMode
    ? totalTeacherCount
    : teacherCount + pendingCount + inactiveCount + rejectedCount;
  $: approvedEnd = totalAccounts ? teacherCount / totalAccounts * 100 : 0;
  $: pendingEnd = approvedEnd + (totalAccounts ? pendingAccountCount / totalAccounts * 100 : 0);
  $: inactiveEnd = pendingEnd + (totalAccounts ? inactiveCount / totalAccounts * 100 : 0);
  $: presentCount = attendance.filter(item => item.status === 'Present').length;
  $: attendanceRate = attendance.length ? Math.round(presentCount / attendance.length * 100) : 0;
  $: recentAudit = audit.slice(0, 5);
  $: donutStyle = totalAccounts
    ? `background:conic-gradient(#700e49 0 ${approvedEnd}%,#ee8eae ${approvedEnd}% ${pendingEnd}%,#d5d2dc ${pendingEnd}% ${inactiveEnd}%,#43aa7c ${inactiveEnd}% 100%)`
    : 'background:#d5d2dc';
</script>

<section class="hero admin-hero">
  <div><h1>Welcome back, {userSettings.firstName}!</h1><p>Manage teacher access, monitor requests, and keep the system running smoothly.</p></div>
  <div class="hero-date"><CalendarDays size={18}/><span>AY {academicYear}<small>Academic year</small></span></div>
  <div class="hero-art"><Building2 size={88}/></div>
</section>
{#if demoMode}
  <section class="stat-grid demo-admin-stat-grid">
    <Stat icon={Users} tone="pink" value={totalTeacherCount} label="Total Teachers" note="View teacher accounts →" onClick={() => onNavigate('Teachers')}/>
    <Stat icon={GraduationCap} tone="violet" value={studentCount} label="Total Students" note="View student records →" onClick={() => onNavigate('Students')}/>
    <Stat icon={Clock3} tone="orange" value={pendingCount} label="Pending Approvals" note="Review registrations →" onClick={() => onNavigate('Pending Approvals')}/>
    <Stat icon={Building2} tone="pink" value={activeCollegeCount} label="Active Colleges" note="View college choices →" onClick={() => onNavigate('Teachers')}/>
    <Stat icon={BookOpen} tone="violet" value={activeClassCount} label="Active Classes" note="Academic year 2026–2027"/>
    <Stat icon={Users} tone="green" value={systemUserCount} label="System Users" note="Teachers, students, administrator"/>
  </section>
{:else}
  <section class="stat-grid four">
    <Stat icon={Users} tone="pink" value={teacherCount} label="Total Teachers" note="View teacher accounts →" onClick={() => onNavigate('Teachers')}/>
    <Stat icon={GraduationCap} tone="violet" value={studentCount} label="Total Students" note="View student records →" onClick={() => onNavigate('Students')}/>
    <Stat icon={Clock3} tone="orange" value={pendingCount} label="Pending Approvals" note="Review registrations →" onClick={() => onNavigate('Pending Approvals')}/>
    <Stat icon={Check} tone="green" value={`${approvalRate}%`} label="Approval Rate" note="Based on teacher accounts"/>
  </section>
{/if}
<div class="dashboard-lower">
  <section class="panel completion-panel">
    <div class="panel-heading"><h3>Teacher Account Status <CircleHelp size={13}/></h3><button class="text-link" onclick={() => onNavigate('Teachers')}>View Accounts <ArrowRight size={13}/></button></div>
    <div class="donut-wrap"><div class="donut" style={donutStyle}><div><strong>{approvalRate}%</strong></div></div><div class="legend"><p><i class="dot plum"></i>Approved <b>{teacherCount}</b></p><p><i class="dot rose"></i>Pending <b>{pendingAccountCount}</b></p><p><i class="dot gray"></i>Inactive <b>{inactiveCount}</b></p><p><i class="dot green"></i>Rejected <b>{rejectedCount}</b></p></div></div>
  </section>
  <section class="notice-card"><div class="notice-icon"><Activity size={20}/></div><h3>Teacher Registrations</h3><p>{pendingCount ? `${pendingCount} teacher registration${pendingCount === 1 ? '' : 's'} awaiting review.` : 'There are no pending teacher registrations.'}</p><button class="primary small" onclick={() => onNavigate('Pending Approvals')}>View Approvals <ArrowRight size={13}/></button><div class="notice-art"><ClipboardCheck size={74}/></div></section>
</div>
{#if demoMode}
  <div class="demo-admin-detail-grid">
    <section class="panel demo-detail-panel">
      <div class="panel-heading"><h3>Attendance Overview</h3></div>
      <div class="demo-attendance-summary">
        <span class="demo-attendance-ring"><strong>{attendanceRate}%</strong></span>
        <div><strong>{presentCount} of {attendance.length} records present</strong><p>Sample attendance across the academic year.</p></div>
      </div>
    </section>
    <section class="panel demo-detail-panel">
      <div class="panel-heading"><h3>Recent Activities</h3><button class="text-link" onclick={() => onNavigate('Audit Log')}>All activity <ArrowRight size={13}/></button></div>
      <div class="demo-activity-list">
        {#each recentAudit as item}
          <div class="demo-activity-row"><span class="demo-activity-mark"><Activity size={14}/></span><div><strong>{item.detail}</strong><small>{item.target} · {new Date(item.time).toLocaleDateString()}</small></div></div>
        {:else}
          <p class="empty-inline">No recent activity is available.</p>
        {/each}
      </div>
    </section>
  </div>
{/if}
