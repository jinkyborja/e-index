<script>
  export let icon;
  export let tone = 'pink';
  export let value = '';
  export let label = '';
  export let note = '';
  export let onClick = null;
</script>
<button class:stat-card-interactive={onClick} class="stat-card stat-card-button" type="button" disabled={!onClick} onclick={onClick || undefined}>
  <div class={`stat-icon ${tone}`}><svelte:component this={icon} size={19} strokeWidth={2.2}/></div>
  <strong class="stat-value">{value}</strong>
  <span class="stat-label">{label}</span>
  <small class={`stat-note ${tone}`}>{note}</small>
  <div class={`stat-decoration ${tone}`}></div>
</button>
