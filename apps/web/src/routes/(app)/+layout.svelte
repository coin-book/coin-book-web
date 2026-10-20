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

  const RAIL_WIDTH_KEY = 'coinbook.railWidth';
  const RAIL_COLLAPSED_KEY = 'coinbook.railCollapsed';
  const RAIL_DEFAULT = 232;
  const RAIL_MIN = 72;
  const RAIL_MAX = 360;
  // Below this the labels no longer fit and the menu shows icons only.
  const RAIL_COMPACT_BELOW = 160;
  const RAIL_KEY_STEP = 16;

  let paletteOpen = $state(false);
  let helpOpen = $state(false);
  let railWidth = $state(storedRailWidth());
  // Collapsed shows icons only and keeps railWidth for expanding again.
  let collapsed = $state(stored(RAIL_COLLAPSED_KEY) === 'true');
  let resizing = $state(false);
  const shownWidth = $derived(collapsed ? RAIL_MIN : railWidth);
  const compact = $derived(shownWidth < RAIL_COMPACT_BELOW);

  function stored(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  // A private window may refuse storage; the choice then lasts for this visit.
  function store(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* not kept */
    }
  }

  function storedRailWidth(): number {
    const width = Number(stored(RAIL_WIDTH_KEY));
    return width ? clampRail(width) : RAIL_DEFAULT;
  }

  function setCollapsed(value: boolean) {
    collapsed = value;
    store(RAIL_COLLAPSED_KEY, String(value));
  }

  function clampRail(width: number) {
    return Math.round(Math.min(RAIL_MAX, Math.max(RAIL_MIN, width)));
  }

  function setRailWidth(width: number) {
    setCollapsed(false);
    railWidth = clampRail(width);
    store(RAIL_WIDTH_KEY, String(railWidth));
  }

  // A menu dragged down to icons expands to the default width, not to its own narrow one.
  function toggleRail() {
    if (!compact) {
      setCollapsed(true);
    } else if (railWidth < RAIL_COMPACT_BELOW) {
      setRailWidth(RAIL_DEFAULT);
    } else {
      setCollapsed(false);
    }
  }

  function startResize(e: PointerEvent) {
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    resizing = true;
  }

  function resize(e: PointerEvent) {
    if (resizing) setRailWidth(e.clientX);
  }

  function resizeByKey(e: KeyboardEvent) {
    const step = { ArrowLeft: -RAIL_KEY_STEP, ArrowRight: RAIL_KEY_STEP }[e.key];
    if (step) {
      e.preventDefault();
      setRailWidth(shownWidth + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setRailWidth(e.key === 'Home' ? RAIL_MIN : RAIL_MAX);
    }
  }

  /** desktopOnly: left out of the phone's bottom bar, which has room for five. */
  type NavItem = {
    href: string;
    label: string;
    icon: string;
    match?: string;
    badge?: number;
    desktopOnly?: boolean;
  };
  type NavGroup = { key: string; label?: string; items: NavItem[] };

  // Overview stands alone; money is the month's flow, wealth what has piled up from it.
  const groups = $derived<NavGroup[]>([
    { key: 'home', items: [{ href: '/overview', label: t('nav.overview'), icon: 'squares-four' }] },
    {
      key: 'money',
      label: t('nav.group.money'),
      items: [
        { href: '/cashflow', label: t('nav.cashflow'), icon: 'coins', desktopOnly: true },
        { href: '/transactions', label: t('nav.transactions'), icon: 'list-bullets' },
        { href: '/triage', label: t('nav.triage'), icon: 'tray', badge: queue.remaining },
        { href: `/budget/${currentMonth()}`, match: '/budget', label: t('nav.budget'), icon: 'target' },
      ],
    },
    {
      key: 'wealth',
      label: t('nav.group.wealth'),
      items: [
        { href: '/net-worth', label: t('nav.netWorth'), icon: 'scales' },
        { href: '/investments', label: t('nav.investments'), icon: 'chart-line-up', desktopOnly: true },
      ],
    },
  ]);
  const secondary = $derived<NavItem[]>([
    { href: '/imports', label: t('nav.imports'), icon: 'upload-simple' },
    { href: '/accounts', label: t('nav.accounts'), icon: 'bank' },
    { href: '/categories', label: t('nav.categories'), icon: 'tag' },
    { href: '/settings', label: t('nav.settings'), icon: 'gear' },
  ]);
  const destinations = $derived(
    [...groups.flatMap((g) => g.items), ...secondary].map((n) => ({
      id: n.href,
      label: n.label,
      icon: n.icon,
      href: n.href,
    })),
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

<div class="shell" class:resizing style:--rail-width="{shownWidth}px">
  <nav class="rail" class:compact aria-label="coin-book">
    <div class="brand-row">
      <a class="brand" href="/overview" aria-label="coin-book">
        <span class="logo" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="display brand-name">coin-book</span>
      </a>
      <button
        type="button"
        class="rail-toggle"
        aria-label={compact ? t('nav.expand') : t('nav.collapse')}
        title={compact ? t('nav.expand') : t('nav.collapse')}
        aria-expanded={!compact}
        onclick={toggleRail}
      >
        <Icon name={compact ? 'caret-right' : 'caret-left'} size={16} weight="bold" />
      </button>
    </div>
    <button
      type="button"
      class="search"
      title={compact ? t('nav.search') : undefined}
      onclick={() => (paletteOpen = true)}
    >
      <Icon name="magnifying-glass" size={16} />
      <span>{t('nav.search')}</span>
      <kbd>⌘K</kbd>
    </button>
    <div class="groups">
      {#each groups as group (group.key)}
        {#if group.label}<p class="group-label" aria-hidden="true">{group.label}</p>{/if}
        <ul aria-label={group.label}>
          {#each group.items as item (item.href)}
            <li class:desktop-only={item.desktopOnly}>
              <a
                href={item.href}
                class:active={isActive(item)}
                aria-current={isActive(item) ? 'page' : undefined}
                title={compact ? item.label : undefined}
              >
                <Icon name={item.icon} size={20} weight={isActive(item) ? 'fill' : 'regular'} />
                <span class="label">{item.label}</span>
                {#if item.badge}<span class="badge num">{item.badge}</span>{/if}
              </a>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
    <p class="group-label secondary-label" aria-hidden="true">{t('nav.group.manage')}</p>
    <ul class="secondary">
      {#each secondary as item (item.href)}
        <li>
          <a
            href={item.href}
            class:active={isActive(item)}
            aria-current={isActive(item) ? 'page' : undefined}
            title={compact ? item.label : undefined}
          >
            <Icon name={item.icon} size={20} weight={isActive(item) ? 'fill' : 'regular'} />
            <span class="label">{item.label}</span>
          </a>
        </li>
      {/each}
      <li>
        <button type="button" title={compact ? t('nav.logout') : undefined} onclick={() => auth.logout()}>
          <Icon name="sign-out" size={20} />
          <span class="label">{t('nav.logout')}</span>
        </button>
      </li>
    </ul>
  </nav>
  <!-- A focusable separator is the ARIA window-splitter pattern; Svelte counts every separator as static. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="rail-handle"
    role="separator"
    aria-orientation="vertical"
    aria-label={t('nav.resize')}
    aria-valuemin={RAIL_MIN}
    aria-valuemax={RAIL_MAX}
    aria-valuenow={shownWidth}
    tabindex="0"
    onpointerdown={startResize}
    onpointermove={resize}
    onpointerup={() => (resizing = false)}
    onpointercancel={() => (resizing = false)}
    ondblclick={() => setRailWidth(RAIL_DEFAULT)}
    onkeydown={resizeByKey}
  ></div>

  <main class="content">
    {@render children()}
  </main>
</div>

<CommandPalette bind:open={paletteOpen} {destinations} {actions} />
<ShortcutsHelp bind:open={helpOpen} />

<style>
  .shell {
    position: relative;
    display: grid;
    grid-template-columns: var(--rail-width, 232px) minmax(0, 1fr);
    min-height: 100dvh;
  }
  .shell.resizing {
    cursor: col-resize;
    user-select: none;
  }
  .rail-handle {
    position: fixed;
    z-index: 30;
    top: 0;
    bottom: 0;
    left: calc(var(--rail-width, 232px) - 4px);
    width: 8px;
    cursor: col-resize;
    touch-action: none;
  }
  .rail-handle::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 3px;
    width: 2px;
    border-radius: 2px;
    background: transparent;
    transition: background 0.15s;
  }
  .rail-handle:hover::after,
  .rail-handle:focus-visible::after,
  .resizing .rail-handle::after {
    background: var(--brand);
  }
  .rail.compact {
    padding-inline: 10px;
  }
  .rail.compact .brand {
    justify-content: center;
    padding-inline: 0;
  }
  .rail.compact .brand-name,
  .rail.compact .search span,
  .rail.compact kbd,
  .rail.compact .label {
    display: none;
  }
  .rail.compact .search,
  .rail.compact li a,
  .rail.compact li button {
    justify-content: center;
    position: relative;
  }
  .rail.compact li a.active::before {
    left: -10px;
  }
  .rail.compact .badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 16px;
    padding: 0 4px;
    font-size: 10px;
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
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .rail-toggle {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    flex: none;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--ink-faint);
    cursor: pointer;
  }
  .rail-toggle:hover {
    background: color-mix(in oklch, var(--ink) 5%, transparent);
    color: var(--ink);
  }
  .rail.compact .brand-row {
    flex-direction: column;
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
  .groups {
    display: grid;
    gap: 2px;
  }
  .group-label {
    margin: 12px 0 2px;
    padding: 0 12px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .secondary-label {
    margin-top: auto;
  }
  .rail.compact .group-label {
    height: 1px;
    margin: 8px 6px;
    padding: 0;
    overflow: hidden;
    color: transparent;
    background: var(--line);
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
    .rail-handle,
    .rail-toggle {
      display: none;
    }
    .rail {
      position: fixed;
      z-index: 40;
      inset: auto 0 0 0;
      height: auto;
      flex-direction: row;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
      overflow: visible;
      background: var(--surface);
      border-top: 1px solid var(--line);
    }
    .brand,
    .search,
    .secondary,
    .group-label {
      display: none;
    }
    .groups {
      grid-auto-flow: column;
      width: 100%;
    }
    .groups ul {
      display: contents;
    }
    .desktop-only {
      display: none;
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
