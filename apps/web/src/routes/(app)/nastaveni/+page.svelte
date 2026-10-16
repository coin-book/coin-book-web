<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { i18n, t, type Locale } from '@coin-book/core/i18n';
  import { theme, type ThemeChoice } from '@coin-book/core/theme';
  import { toasts } from '@coin-book/core/toast';
  import type { AgentToken, AuditEntry } from '@coin-book/core/types';
  import Button from '@coin-book/ui/Button.svelte';
  import Icon from '@coin-book/ui/Icon.svelte';

  const scopes = [
    'transactions:read',
    'budgets:read',
    'reports:read',
    'categories:read',
    'accounts:read',
  ] as const;
  const expiries = ['30', '90', '365', 'never'] as const;

  let tokens = $state<AgentToken[]>([]);
  let audit = $state<AuditEntry[]>([]);
  let name = $state('');
  let chosen = $state<string[]>(['transactions:read', 'budgets:read', 'reports:read', 'categories:read']);
  let expiry = $state<(typeof expiries)[number]>('90');
  let secret = $state<string | null>(null);
  let creating = $state(false);

  onMount(() => void load());

  async function load() {
    const [tk, au] = await Promise.all([
      api.get<{ tokens: AgentToken[] }>('/agent-tokens'),
      api.get<{ entries: AuditEntry[] }>('/audit-log'),
    ]);
    tokens = tk.tokens;
    audit = au.entries;
  }

  async function create(e: SubmitEvent) {
    e.preventDefault();
    creating = true;
    try {
      const res = await api.post<{ token: AgentToken; secret: string }>('/agent-tokens', {
        name: name.trim(),
        scopes: chosen,
        expires_in_days: expiry === 'never' ? undefined : Number(expiry),
      });
      secret = res.secret;
      name = '';
      await load();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      creating = false;
    }
  }

  async function revoke(token: AgentToken) {
    try {
      await api.delete(`/agent-tokens/${token.id}`);
      toasts.show(t('settings.tokenRevoked'), 'success');
      await load();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    }
  }

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    toasts.show(t('settings.tokenCopied'), 'success');
  }

  function tokenState(token: AgentToken): string | null {
    if (token.revoked_at) return t('settings.tokenStateRevoked');
    if (token.expires_at && new Date(token.expires_at) < new Date()) return t('settings.tokenStateExpired');
    return null;
  }

  const when = (iso: string) => new Date(iso).toLocaleString(i18n.intlLocale);
</script>

<svelte:head><title>{t('settings.title')} · coin-book</title></svelte:head>

<h1 class="display title">{t('settings.title')}</h1>

<section class="panel prefs">
  <fieldset>
    <legend>{t('settings.language')}</legend>
    <div class="segmented">
      {#each [['cs', 'Čeština'], ['sk', 'Slovenčina']] as [value, label] (value)}
        <button type="button" class:on={i18n.locale === value} onclick={() => i18n.set(value as Locale)}
          >{label}</button
        >
      {/each}
    </div>
  </fieldset>
  <fieldset>
    <legend>{t('settings.theme')}</legend>
    <div class="segmented">
      {#each ['system', 'light', 'dark'] as value (value)}
        <button
          type="button"
          class:on={theme.choice === value}
          onclick={() => theme.set(value as ThemeChoice)}
        >
          {t(`settings.theme.${value as ThemeChoice}`)}
        </button>
      {/each}
    </div>
  </fieldset>
</section>

<section class="panel">
  <header class="section-head">
    <span class="glyph"><Icon name="robot" size={24} weight="duotone" /></span>
    <div>
      <h2 class="display">{t('settings.tokens')}</h2>
      <p class="lead">{t('settings.tokensLead')}</p>
    </div>
  </header>

  {#if secret}
    <div class="secret" role="status">
      <p>{t('settings.tokenSecret')}</p>
      <code>{secret}</code>
      <div class="secret-actions">
        <Button icon="copy" onclick={copy}>{t('settings.tokenCopy')}</Button>
        <Button variant="ghost" onclick={() => (secret = null)}>{t('common.close')}</Button>
      </div>
    </div>
  {/if}

  <form class="create" onsubmit={create}>
    <label class="field">
      <span>{t('settings.tokenName')}</span>
      <input bind:value={name} required maxlength="80" placeholder={t('settings.tokenNamePlaceholder')} />
    </label>
    <fieldset class="field">
      <legend>{t('settings.tokenScopes')}</legend>
      <div class="scopes">
        {#each scopes as scope (scope)}
          <label class="scope">
            <input type="checkbox" value={scope} bind:group={chosen} />
            {t(`scope.${scope}`)}
          </label>
        {/each}
      </div>
    </fieldset>
    <label class="field">
      <span>{t('settings.tokenExpiry')}</span>
      <select bind:value={expiry}>
        {#each expiries as e (e)}<option value={e}>{t(`settings.tokenExpiry.${e}`)}</option>{/each}
      </select>
    </label>
    <Button type="submit" busy={creating} disabled={chosen.length === 0}>{t('settings.tokenCreate')}</Button>
  </form>

  {#if tokens.length === 0}
    <p class="quiet">{t('settings.tokensEmpty')}</p>
  {:else}
    <ul class="tokens">
      {#each tokens as token (token.id)}
        <li class:inactive={tokenState(token) !== null}>
          <div>
            <strong>{token.name}</strong>
            <span class="num last4">…{token.last4}</span>
            {#if tokenState(token)}<span class="tag">{tokenState(token)}</span>{/if}
            <div class="meta">
              {token.scopes.map((s) => t(`scope.${s as (typeof scopes)[number]}`)).join(', ')}
            </div>
            <div class="meta">
              {token.last_used_at
                ? t('settings.tokenLastUsed', { date: when(token.last_used_at) })
                : t('settings.tokenNeverUsed')}
            </div>
          </div>
          {#if !tokenState(token)}
            <Button variant="danger" onclick={() => revoke(token)}>{t('settings.tokenRevoke')}</Button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="panel">
  <h2 class="display">{t('settings.audit')}</h2>
  {#if audit.length === 0}
    <p class="quiet">{t('settings.auditEmpty')}</p>
  {:else}
    <table class="audit">
      <tbody>
        {#each audit as entry (entry.id)}
          <tr class:denied={entry.status >= 400}>
            <td class="num">{when(entry.occurred_at)}</td>
            <td>{entry.token_name}</td>
            <td><code>{entry.operation}</code></td>
            <td class="num status">{entry.status}</td>
            <td class="num">{entry.result_count ?? ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .title {
    margin: 0 0 20px;
    font-size: var(--text-headline);
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .panel h2 {
    margin: 0;
    font-size: var(--text-title);
  }
  .prefs {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend,
  .field > span {
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-soft);
    margin-bottom: 6px;
    padding: 0;
  }
  .segmented {
    display: inline-flex;
    padding: 3px;
    border-radius: 12px;
    background: var(--canvas);
  }
  .segmented button {
    border: 0;
    padding: 7px 14px;
    border-radius: 9px;
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .segmented button.on {
    background: var(--surface);
    color: var(--brand);
    box-shadow: var(--glow);
  }
  .section-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 16px;
  }
  .glyph {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in oklch, var(--cat-ametyst) 16%, transparent);
    color: var(--cat-ametyst);
    flex: none;
  }
  .lead {
    margin: 4px 0 0;
    color: var(--ink-soft);
    max-width: 60ch;
  }
  .secret {
    padding: 16px;
    margin-bottom: 18px;
    border-radius: 14px;
    background: color-mix(in oklch, var(--warn) 18%, transparent);
  }
  .secret p {
    margin: 0 0 8px;
    font-weight: 650;
  }
  .secret code {
    display: block;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--surface);
    overflow-wrap: anywhere;
    font-size: 14px;
  }
  .secret-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .create {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(0, 2fr) auto auto;
    gap: 16px;
    align-items: end;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line);
  }
  .field {
    display: grid;
    gap: 4px;
  }
  .field input,
  .field select {
    padding: 9px 11px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
  }
  .scopes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  .scope {
    display: flex;
    gap: 6px;
    align-items: center;
    cursor: pointer;
  }
  .scope input {
    accent-color: var(--brand);
  }
  .tokens {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tokens li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
  }
  .tokens li.inactive {
    opacity: 0.55;
  }
  .last4 {
    margin-left: 6px;
    color: var(--ink-faint);
  }
  .tag {
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--canvas);
    font-size: var(--text-micro);
  }
  .meta {
    font-size: var(--text-micro);
    color: var(--ink-faint);
  }
  .audit {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: var(--text-micro);
  }
  .audit td {
    padding: 7px 8px;
    border-top: 1px solid var(--line);
  }
  .audit .status {
    font-weight: 700;
    color: var(--income);
  }
  .audit tr.denied .status {
    color: var(--over);
  }
  .quiet {
    color: var(--ink-soft);
  }
  @media (max-width: 900px) {
    .create {
      grid-template-columns: 1fr;
    }
  }
</style>
