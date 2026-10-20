<script lang="ts">
  import { auth } from '@coin-book/core/auth';
  import { i18n, locales, translate, type Locale, type MessageKey } from '@coin-book/core/i18n';
  import Button from '@coin-book/ui/Button.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';
  import { absolute, indexable, landingPaths, ogLocales } from '$lib/landing';

  let { data } = $props();

  const locale = $derived(data.locale);
  const t = (key: MessageKey) => translate(locale, key);
  const languageNames: Record<Locale, string> = { cs: 'Čeština', sk: 'Slovenčina', en: 'English' };

  // Pictures come from `make landing-shots`, a light and a dark one per screen; retake
  // them whenever the screens change.
  const features: { key: string; icon: string }[] = [
    { key: 'overview', icon: 'squares-four' },
    { key: 'cashflow', icon: 'coins' },
    { key: 'triage', icon: 'tray' },
    { key: 'budget', icon: 'target' },
    { key: 'netWorth', icon: 'scales' },
    { key: 'mortgage', icon: 'house' },
    { key: 'investments', icon: 'chart-line-up' },
    { key: 'instrument', icon: 'chart-line-up' },
    { key: 'imports', icon: 'upload-simple' },
  ];
  const promises = ['selfHosted', 'private', 'agents', 'backups'] as const;
  const promiseIcons = {
    selfHosted: 'house',
    private: 'check-circle',
    agents: 'lightning',
    backups: 'download-simple',
  };

  const text = (key: string) => t(key as MessageKey);

  const structuredData = $derived({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'coin-book',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Docker, TrueNAS SCALE',
    description: t('landing.lead'),
    inLanguage: locale,
    url: absolute(landingPaths[locale]),
    image: absolute('/landing/overview.jpg'),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    sameAs: ['https://github.com/coin-book'],
  });
  // JSON in a script element must not be able to close it.
  const structuredDataTag = $derived(
    `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</` +
      'script>',
  );

  $effect(() => {
    document.documentElement.lang = locale;
  });
</script>

{#snippet shot(key: string, lazy: boolean)}
  {@const alt = text(`landing.${key}.title`)}
  {@const loading = lazy ? 'lazy' : 'eager'}
  <img class="light" src="/landing/{key}.jpg" {alt} width="1280" height="820" {loading} />
  <img class="dark" src="/landing/{key}-dark.jpg" {alt} width="1280" height="820" {loading} />
{/snippet}

<svelte:head>
  <title>coin-book · {t('landing.tagline')}</title>
  <meta name="description" content={t('landing.lead')} />
  {#if indexable}
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href={absolute(landingPaths[locale])} />
    {#each locales as l (l)}
      <link rel="alternate" hreflang={l} href={absolute(landingPaths[l])} />
    {/each}
    <link rel="alternate" hreflang="x-default" href={absolute(landingPaths.cs)} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="coin-book" />
    <meta property="og:title" content="coin-book · {t('landing.tagline')}" />
    <meta property="og:description" content={t('landing.lead')} />
    <meta property="og:url" content={absolute(landingPaths[locale])} />
    <meta property="og:image" content={absolute('/landing/overview.jpg')} />
    <meta property="og:image:width" content="2560" />
    <meta property="og:image:height" content="1640" />
    <meta property="og:image:alt" content={t('landing.overview.title')} />
    <meta property="og:locale" content={ogLocales[locale]} />
    {#each locales.filter((l) => l !== locale) as l (l)}
      <meta property="og:locale:alternate" content={ogLocales[l]} />
    {/each}
    <meta name="twitter:card" content="summary_large_image" />
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON built from our own copy -->
    {@html structuredDataTag}
  {:else}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
</svelte:head>

<main class="landing">
  <header class="top">
    <span class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>coin-book</span>
    <div class="top-actions">
      <nav class="languages" aria-label={t('settings.language')}>
        {#each locales as l (l)}
          <a
            href={landingPaths[l]}
            hreflang={l}
            lang={l}
            title={languageNames[l]}
            aria-current={l === locale ? 'page' : undefined}
            onclick={() => i18n.set(l)}>{l.toUpperCase()}</a
          >
        {/each}
      </nav>
      {#if auth.signedIn}
        <Button href="/overview" icon="squares-four">{t('landing.open')}</Button>
      {:else}
        <Button variant="ghost" href="/login">{t('auth.login')}</Button>
      {/if}
    </div>
  </header>

  <section class="hero">
    <h1 class="display">{t('landing.tagline')}</h1>
    <p class="lead">{t('landing.lead')}</p>
    <div class="cta">
      {#if auth.signedIn}
        <Button href="/overview" icon="squares-four">{t('landing.open')}</Button>
      {:else}
        <Button href="/login?register=1">{t('landing.register')}</Button>
        <Button variant="quiet" href="/login">{t('auth.login')}</Button>
      {/if}
    </div>
    <figure class="hero-shot">
      {@render shot('overview', false)}
    </figure>
  </section>

  {#each features.slice(1) as f, i (f.key)}
    <section class="feature" class:flip={i % 2 === 1} data-testid="landing-feature">
      <div class="copy">
        <span class="badge" aria-hidden="true"><Icon name={f.icon} size={20} weight="duotone" /></span>
        <h2>{text(`landing.${f.key}.title`)}</h2>
        <p>{text(`landing.${f.key}.body`)}</p>
      </div>
      <figure>
        {@render shot(f.key, true)}
      </figure>
    </section>
  {/each}

  <section class="promises">
    <h2>{t('landing.promisesTitle')}</h2>
    <ul>
      {#each promises as p (p)}
        <li>
          <Icon name={promiseIcons[p]} size={22} weight="duotone" />
          <h3>{text(`landing.promise.${p}.title`)}</h3>
          <p>{text(`landing.promise.${p}.body`)}</p>
        </li>
      {/each}
    </ul>
  </section>

  <footer class="foot">
    <span>coin-book</span>
    <a href="https://github.com/coin-book">GitHub</a>
  </footer>
</main>

<style>
  .landing {
    max-width: 1180px;
    margin: 0 auto;
    padding: 20px clamp(16px, 4vw, 40px) 40px;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: clamp(30px, 6vw, 70px);
  }
  .top-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .languages {
    display: flex;
    gap: 2px;
  }
  .languages a {
    padding: 4px 8px;
    border-radius: 8px;
    color: var(--ink-faint);
    font-size: var(--text-micro);
    font-weight: 700;
    text-decoration: none;
  }
  .languages a:hover {
    color: var(--ink);
  }
  .languages a[aria-current='page'] {
    color: var(--brand);
    background: color-mix(in oklch, var(--brand) 12%, transparent);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: var(--text-lead);
    font-weight: 800;
  }
  .mark {
    display: grid;
    gap: 3px;
  }
  .mark i {
    display: block;
    height: 5px;
    border-radius: 3px;
  }
  .mark i:nth-child(1) {
    width: 22px;
    background: var(--cat-malina);
  }
  .mark i:nth-child(2) {
    width: 16px;
    background: var(--cat-slunecnice);
  }
  .mark i:nth-child(3) {
    width: 19px;
    background: var(--cat-smaragd);
  }
  .hero {
    text-align: center;
    margin-bottom: clamp(50px, 8vw, 100px);
  }
  .hero h1 {
    margin: 0 auto 16px;
    max-width: 18ch;
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    line-height: 1.05;
  }
  .lead {
    margin: 0 auto 26px;
    max-width: 60ch;
    font-size: var(--text-lead);
    color: var(--ink-soft);
  }
  .cta {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 40px;
  }
  figure {
    margin: 0;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 18px;
    box-shadow: var(--shadow-float);
    background: var(--surface);
  }
  /* Follows the theme rules in theme.css: the system's choice unless the user picked one. */
  img.dark {
    display: none;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) img.dark {
      display: block;
    }
    :global(:root:not([data-theme='light'])) img.light {
      display: none;
    }
  }
  :global(:root[data-theme='dark']) img.dark {
    display: block;
  }
  :global(:root[data-theme='dark']) img.light {
    display: none;
  }
  .feature {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
    gap: clamp(24px, 5vw, 60px);
    align-items: center;
    margin-bottom: clamp(50px, 8vw, 90px);
  }
  .feature.flip {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr);
  }
  .feature.flip .copy {
    order: 2;
  }
  .badge {
    display: inline-grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    color: var(--brand);
    background: color-mix(in oklch, var(--brand) 14%, transparent);
    margin-bottom: 14px;
  }
  .feature h2,
  .promises h2 {
    margin: 0 0 10px;
    font-size: var(--text-title);
  }
  .feature p {
    margin: 0;
    color: var(--ink-soft);
    line-height: 1.55;
  }
  .promises {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: clamp(22px, 4vw, 40px);
    margin-bottom: 30px;
  }
  .promises ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 24px;
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
  }
  .promises li {
    color: var(--brand);
  }
  .promises h3 {
    margin: 8px 0 4px;
    font-size: var(--text-body);
    color: var(--ink);
  }
  .promises p {
    margin: 0;
    font-size: var(--text-micro);
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .foot a {
    color: inherit;
  }
  @media (max-width: 820px) {
    .feature,
    .feature.flip {
      grid-template-columns: 1fr;
    }
    .feature.flip .copy {
      order: 0;
    }
  }
</style>
