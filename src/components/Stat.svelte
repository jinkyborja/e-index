<script>
  export let icon;
  export let iconSize = 19;
  export let badgeIcon = null;
  export let tone = 'pink';
  export let value = '';
  export let label = '';
  export let note = '';
  export let onClick = null;
  export let context = '';
  export let progress = null;
  export let decorationIcon = null;
  $: progressValue = Math.max(0, Math.min(100, Number(progress) || 0));
</script>
<button class:stat-card-interactive={onClick} class="stat-card stat-card-button" type="button" disabled={!onClick} onclick={onClick || undefined}>
  <div class={`stat-icon ${tone}`}>
    <svelte:component this={icon} size={iconSize} strokeWidth={2.2}/>
    {#if badgeIcon}<span class="stat-icon-badge" aria-hidden="true"><svelte:component this={badgeIcon} size={10} strokeWidth={2.5}/></span>{/if}
  </div>
  <strong class="stat-value">{value}</strong>
  <span class="stat-label">{label}</span>
  <small class={`stat-note ${tone}`}>{note}</small>
  {#if context}<span class="stat-supporting">{context}</span>{/if}
  {#if progress !== null}
    <div class="stat-progress" role="progressbar" aria-label={`${label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressValue}>
      <span style={`width: ${progressValue}%`}></span>
    </div>
  {/if}
  <div class={`stat-decoration ${tone} ${decorationIcon ? 'has-icon' : ''}`} aria-hidden="true">
    {#if decorationIcon}
      <svelte:component this={decorationIcon} size={58} strokeWidth={1.5}/>
      {#if badgeIcon}<span class="stat-decoration-badge"><svelte:component this={badgeIcon} size={14} strokeWidth={2}/></span>{/if}
    {/if}
  </div>
</button>
