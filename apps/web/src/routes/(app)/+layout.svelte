<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '@coin-book/core/auth';
  import { currentMonth, shiftMonth } from '@coin-book/core/dates';
  import { t } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import CommandPalette from '@coin-book/ui/CommandPalette.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import { queue } from '$lib/queue.svelte';
  import ShortcutsHelp from '$lib/ShortcutsHelp.svelte';

  let { children } = $props();

  let paletteOpen = $state(false);
  let helpOpen = $state(false);

  const nav = $derived([
    { href: '/overview', label: t('nav.overview'), icon: 'squares-four' },
    { href: '/transactions', label: t('nav.transactions'), icon: 'list-bullets' },
    { href: '/triage', label: t('nav.triage'), icon: 'tray', badge: queue.remaining },
    { href: `/budget/${currentMonth()}`, match: '/budget', label: t('nav.budget'), icon: 'target' },
    { href: '/investments', label: t('nav.investments'), icon: 'chart-line-up' },
    { href: '/imports', label: t('nav.imports'), icon: 'upload-simple' },
  ]);
  const secondary = $derived([
    { href: '/accounts', label: t('nav.accounts'), icon: 'bank' },
    { href: '/categories', label: t('nav.categories'), icon: 'tag' },
    { href: '/settings', label: t('nav.settings'), icon: 'gear' },
  ]);
  const destinations = $derived(
    [...nav, ...secondary].map((n) => ({ id: n.href, label: n.label, icon: n.icon, href: n.href })),
  );
  const actions = $derived([
    { id: 'upload', label: t('palette.upload'), icon: 'upload-simple', href: '/imports' },
    {
      id: 'next-budget',
      label: t('palette.nextBudget'),
      icon: 'target',
      href: `/budget/${shiftMonth(currentMonth(), 1)}`,
    },
  ]);

  onMount(() => {
    void taxonomy.load();
    void queue.refresh();
  });

  function isActive(item: { href: string; match?: string }) {
    return page.url.pathname.startsWith(item.match ?? item.href);
  }

  function typing(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
  }

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen = !paletteOpen;
      return;
    }
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') {
      helpOpen = !helpOpen;
    } else if (e.key === '/') {
      e.preventDefault();
      goto('/transactions?focus=search');
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="shell">
  <nav class="rail" aria-label="coin-book">
    <a class="brand" href="/overview" aria-label="coin-book">
      <span class="logo" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="display brand-name">coin-book</span>
    </a>
    <button type="button" class="search" onclick={() => (paletteOpen = true)}>
      <Icon name="magnifying-glass" size={16} />
      <span>{t('nav.search')}</span>
      <kbd>⌘K</kbd>
    </button>
    <ul>
      {#each nav as item (item.href)}
        <li>
          <a
            href={item.href}
            class:active={isActive(item)}
            aria-current={isActive(item) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} weight={isActive(item) ? 'fill' : 'regular'} />
            <span class="label">{item.label}</span>
            {#if item.badge}<span class="badge num">{item.badge}</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
    <ul class="secondary">
      {#each secondary as item (item.href)}
        <li>
          <a
            href={item.href}
            class:active={isActive(item)}
            aria-current={isActive(item) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} weight={isActive(item) ? 'fill' : 'regular'} />
            <span class="label">{item.label}</span>
          </a>
        </li>
      {/each}
      <li>
        <button type="button" onclick={() => auth.logout()}>
          <Icon name="sign-out" size={20} />
          <span class="label">{t('nav.logout')}</span>
        </button>
      </li>
    </ul>
  </nav>

  <main class="content">
    {@render children()}
  </main>
</div>

<CommandPalette bind:open={paletteOpen} {destinations} {actions} />
<ShortcutsHelp bind:open={helpOpen} />

<style>
  .shell {
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr);
    min-height: 100dvh;
  }
  .rail {
    position: sticky;
    top: 0;
    height: 100dvh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px 14px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px 6px;
    color: var(--ink);
    text-decoration: none;
  }
  .logo {
    display: grid;
    gap: 3px;
    width: 26px;
  }
  .logo i {
    display: block;
    height: 6px;
    border-radius: 99px;
  }
  .logo i:nth-child(1) {
    background: var(--cat-malina);
  }
  .logo i:nth-child(2) {
    background: var(--cat-slunecnice);
    width: 66%;
  }
  .logo i:nth-child(3) {
    background: var(--cat-smaragd);
    width: 84%;
  }
  .brand-name {
    font-size: 21px;
    font-weight: 700;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: var(--radius-input);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-faint);
    font: inherit;
    cursor: pointer;
  }
  .search span {
    flex: 1;
    text-align: left;
  }
  kbd {
    font: inherit;
    font-size: 12px;
    color: var(--ink-faint);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .secondary {
    margin-top: auto;
  }
  li a,
  li button {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 12px;
    border: 0;
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
  li a:hover,
  li button:hover {
    background: color-mix(in oklch, var(--ink) 5%, transparent);
    color: var(--ink);
  }
  li a.active {
    position: relative;
    background: color-mix(in oklch, var(--brand) 12%, transparent);
    color: var(--brand);
    text-shadow: var(--glow-text);
  }
  li a.active::before {
    content: '';
    position: absolute;
    left: -14px;
    top: 9px;
    bottom: 9px;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: var(--brand);
    box-shadow: var(--glow);
  }
  .label {
    flex: 1;
    text-align: left;
  }
  .badge {
    min-width: 22px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--warn);
    color: var(--on-light);
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }
  .content {
    min-width: 0;
    padding: 30px clamp(16px, 4vw, 48px) 80px;
  }
  @media (max-width: 860px) {
    .shell {
      grid-template-columns: 1fr;
    }
    .rail {
      position: fixed;
      z-index: 40;
      inset: auto 0 0 0;
      height: auto;
      flex-direction: row;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
      background: var(--surface);
      border-top: 1px solid var(--line);
    }
    .brand,
    .search,
    .secondary {
      display: none;
    }
    .rail ul {
      grid-auto-flow: column;
      width: 100%;
    }
    li a.active::before {
      left: 30%;
      right: 30%;
      top: -6px;
      bottom: auto;
      width: auto;
      height: 3px;
      border-radius: 0 0 4px 4px;
    }
    li a {
      flex-direction: column;
      gap: 2px;
      padding: 6px 4px;
      font-size: 11px;
      position: relative;
    }
    .badge {
      position: absolute;
      top: 0;
      right: 18%;
      min-width: 16px;
      padding: 0 4px;
      font-size: 10px;
    }
    .content {
      padding-bottom: 110px;
    }
  }
</style>
