<script>
  import Stat from './Stat.svelte';
  import {
    Activity, ArrowRight, Building2, CalendarDays, Check, ClipboardCheck,
    CircleHelp, Clock3, GraduationCap, Users
  } from 'lucide-svelte';

  export let userSettings;
  export let teacherCount;
  export let studentCount;
  export let pendingCount;
  export let approvalRate;
  export let inactiveCount = 0;
  export let rejectedCount = 0;
  export let academicYear;
  export let onNavigate;

  $: totalAccounts = teacherCount + pendingCount + inactiveCount + rejectedCount;
  $: approvedEnd = totalAccounts ? teacherCount / totalAccounts * 100 : 0;
  $: pendingEnd = approvedEnd + (totalAccounts ? pendingCount / totalAccounts * 100 : 0);
  $: inactiveEnd = pendingEnd + (totalAccounts ? inactiveCount / totalAccounts * 100 : 0);
  $: donutStyle = totalAccounts
    ? `background:conic-gradient(#700e49 0 ${approvedEnd}%,#ee8eae ${approvedEnd}% ${pendingEnd}%,#d5d2dc ${pendingEnd}% ${inactiveEnd}%,#43aa7c ${inactiveEnd}% 100%)`
    : 'background:#d5d2dc';
</script>

<section class="hero admin-hero">
  <div><h1>Welcome back, {userSettings.firstName}!</h1><p>Manage teacher access, monitor requests, and keep the system running smoothly.</p></div>
  <div class="hero-date"><CalendarDays size={18}/><span>AY {academicYear}<small>Academic year</small></span></div>
  <div class="hero-art"><Building2 size={88}/></div>
</section>
<section class="stat-grid four">
  <Stat icon={Users} tone="pink" value={teacherCount} label="Total Teachers" note="View teacher accounts →" onClick={() => onNavigate('Teachers')}/>
  <Stat icon={GraduationCap} tone="violet" value={studentCount} label="Total Students" note="View student records →" onClick={() => onNavigate('Students')}/>
  <Stat icon={Clock3} tone="orange" value={pendingCount} label="Pending Approvals" note="Review registrations →" onClick={() => onNavigate('Pending Approvals')}/>
  <Stat icon={Check} tone="green" value={`${approvalRate}%`} label="Approval Rate" note="Based on teacher accounts"/>
</section>
<div class="dashboard-lower">
  <section class="panel completion-panel">
    <div class="panel-heading"><h3>Teacher Account Status <CircleHelp size={13}/></h3><button class="text-link" onclick={() => onNavigate('Teachers')}>View Accounts <ArrowRight size={13}/></button></div>
    <div class="donut-wrap"><div class="donut" style={donutStyle}><div><strong>{approvalRate}%</strong></div></div><div class="legend"><p><i class="dot plum"></i>Approved <b>{teacherCount}</b></p><p><i class="dot rose"></i>Pending <b>{pendingCount}</b></p><p><i class="dot gray"></i>Inactive <b>{inactiveCount}</b></p><p><i class="dot green"></i>Rejected <b>{rejectedCount}</b></p></div></div>
  </section>
  <section class="notice-card"><div class="notice-icon"><Activity size={20}/></div><h3>Teacher Registrations</h3><p>{pendingCount ? `${pendingCount} teacher registration${pendingCount === 1 ? '' : 's'} awaiting review.` : 'There are no pending teacher registrations.'}</p><button class="primary small" onclick={() => onNavigate('Pending Approvals')}>View Approvals <ArrowRight size={13}/></button><div class="notice-art"><ClipboardCheck size={74}/></div></section>
</div>
