<script lang="ts">
  import { page } from '$app/state';
  import { apiErrorMessage, t, type MessageKey } from '@coin-book/core/i18n';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import Icon from '@coin-book/ui/Icon.svelte';
  import AssetDetail from '$lib/AssetDetail.svelte';
  import LoanDetail from '$lib/LoanDetail.svelte';

  const loanKinds = new Set(['mortgage', 'loan']);

  // A loan reserve is read on its mortgage's page.
  const account = $derived.by(() => {
    const a = taxonomy.accountsById.get(page.params.account ?? '');
    return a?.kind === 'loan_reserve' && a.parent_id ? taxonomy.accountsById.get(a.parent_id) : a;
  });
</script>

<svelte:head><title>{account?.name ?? t('netWorth.title')} · coin-book</title></svelte:head>

<a class="back" href="/net-worth"><Icon name="caret-left" size={14} weight="bold" /> {t('asset.back')}</a>

{#if account}
  <header class="head">
    <h1 class="display title">{account.name}</h1>
    {#if t(`accounts.kind.${account.kind}` as MessageKey) !== account.name}
      <span class="kind">{t(`accounts.kind.${account.kind}` as MessageKey)}</span>
    {/if}
  </header>
  {#key account.id}
    {#if loanKinds.has(account.kind)}
      <LoanDetail {account} />
    {:else}
      <AssetDetail {account} />
    {/if}
  {/key}
{:else if taxonomy.loaded}
  <p class="quiet">{apiErrorMessage('not_found')}</p>
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--brand);
    text-decoration: none;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 8px 0 22px;
  }
  .title {
    margin: 0;
    font-size: var(--text-headline);
  }
  .kind,
  .quiet {
    color: var(--ink-soft);
  }
</style>
