<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '@coin-book/core/auth';
  import { i18n, t } from '@coin-book/core/i18n';
  import { theme } from '@coin-book/core/theme';
  import Toasts from '@coin-book/ui/Toasts.svelte';
  import { landingLocale } from '$lib/landing';

  let { children } = $props();

  // The landing pages are for everyone; only the sign-in page sends a signed-in user on.
  const isLanding = $derived(landingLocale(page.url.pathname) !== null);

  onMount(async () => {
    theme.init();
    if (!isLanding) document.documentElement.lang = i18n.locale;
    auth.init(() => goto('/login'));
    try {
      await auth.restore();
    } catch {
      auth.ready = true;
    }
  });

  $effect(() => {
    if (!auth.ready) return;
    const isPublic = isLanding || page.url.pathname === '/login';
    if (!auth.signedIn && !isPublic) goto('/login');
    if (auth.signedIn && page.url.pathname === '/login') goto('/overview');
  });
</script>

<!-- A prerendered landing page shows at once; the app waits for the session. -->
{#if auth.ready || isLanding}
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
