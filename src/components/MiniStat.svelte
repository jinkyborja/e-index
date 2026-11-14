<script>
  export let icon;
  export let tone = 'green';
  export let label = '';
  export let value = '0';
</script>
<div class={`mini-stat ${tone}`}><svelte:component this={icon} size={15}/><small>{label}</small><strong>{value}</strong></div>
