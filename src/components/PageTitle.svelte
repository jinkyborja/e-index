<script>
  export let icon;
  export let title = '';
  export let subtitle = '';
  export let action = '';
  export let onAction = null;
</script>
<div class="page-title">
  <div class="page-title-main"><div class="page-title-icon"><svelte:component this={icon} size={21}/></div><div><h1>{title}</h1><p>{subtitle}</p></div></div>
  {#if action}<button class="primary" onclick={onAction}><span>+</span>{action}</button>{/if}
</div>
