<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '@coin-book/core/auth';
  import { i18n, t } from '@coin-book/core/i18n';
  import { theme } from '@coin-book/core/theme';
  import Toasts from '@coin-book/ui/Toasts.svelte';

  let { children } = $props();

  const publicPaths = ['/login'];

  onMount(async () => {
    theme.init();
    document.documentElement.lang = i18n.locale;
    auth.init(() => goto('/login'));
    try {
      await auth.restore();
    } catch {
      auth.ready = true;
    }
  });

  $effect(() => {
    if (!auth.ready) return;
    const isPublic = publicPaths.includes(page.url.pathname);
    if (!auth.signedIn && !isPublic) goto('/login');
    if (auth.signedIn && isPublic) goto('/prehled');
  });
</script>

{#if auth.ready}
  {@render children()}
{:else}
  <div class="boot" aria-live="polite">{t('common.loading')}</div>
{/if}
<Toasts />

<style>
  .boot {
    display: grid;
    place-items: center;
    min-height: 100dvh;
    color: var(--ink-faint);
  }
</style>
