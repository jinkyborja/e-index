<script>
  export let icon;
  export let label = '';
  export let onClick = () => {};
</script>
<button class="quick-action" onclick={onClick}>
  <span><svelte:component this={icon} size={18}/></span>
  <small>{label}</small>
</button>
