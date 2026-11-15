<script>
  export let icon;
  export let title = '';
  export let subtitle = '';
  export let action = '';
  export let onAction = null;
  export let actionDisabled = false;
  export let actionIcon = null;
  export let approvalPage = false;
</script>
<div class="page-title" class:approval-page-title={approvalPage}>
  <div class="page-title-main"><div class="page-title-icon"><svelte:component this={icon} size={21}/></div><div><h1>{title}</h1><p>{subtitle}</p></div></div>
  {#if action}<button class="primary" disabled={actionDisabled} onclick={onAction}>{#if actionIcon}<svelte:component this={actionIcon} size={15}/>{:else}<span>+</span>{/if}{action}</button>{/if}
</div>
