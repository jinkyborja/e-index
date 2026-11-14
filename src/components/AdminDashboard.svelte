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
  export let onNavigate;
</script>

<section class="hero admin-hero">
  <div><h1>Welcome back, {userSettings.firstName}!</h1><p>Manage teacher access, monitor requests, and keep the system running smoothly.</p></div>
  <div class="hero-date"><CalendarDays size={18}/><span>AY 2026-2027<small>1st Semester</small></span></div>
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
    <div class="panel-heading"><h3>E-Index Completion by Department <CircleHelp size={13}/></h3><button class="text-link" onclick={() => onNavigate('Audit Log')}>View Details <ArrowRight size={13}/></button></div>
    <div class="donut-wrap"><div class="donut"><div><strong>72%</strong></div></div><div class="legend"><p><i class="dot plum"></i>Completed <b>72%</b></p><p><i class="dot rose"></i>In Progress <b>18%</b></p><p><i class="dot gray"></i>Not Started <b>10%</b></p></div></div>
  </section>
  <section class="notice-card"><div class="notice-icon"><Activity size={20}/></div><h3>Important Notice</h3><p>Please review pending teacher registrations for AY 2026-2027.</p><button class="primary small" onclick={() => onNavigate('Pending Approvals')}>View Approvals <ArrowRight size={13}/></button><div class="notice-art"><ClipboardCheck size={74}/></div></section>
</div>
