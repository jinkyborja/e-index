<script>
  import { ArrowRight } from 'lucide-svelte';

  export let icon;
  export let label = '';
  export let description = '';
  export let onClick = () => {};
</script>
<button class="quick-action" type="button" onclick={onClick}>
  <span class="quick-action-icon" aria-hidden="true"><svelte:component this={icon} size={20}/></span>
  <i class="quick-action-divider" aria-hidden="true"></i>
  <span class="quick-action-copy">
    <strong>{label}</strong>
    <small>{description}</small>
  </span>
  <span class="quick-action-arrow" aria-hidden="true"><ArrowRight size={16}/></span>
</button>
