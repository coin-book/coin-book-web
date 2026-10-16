<script lang="ts">
  import { auth } from '@coin-book/core/auth';
  import { ApiError } from '@coin-book/core/api';
  import { errorText } from '@coin-book/core/errors';
  import { t } from '@coin-book/core/i18n';
  import Button from '@coin-book/ui/Button.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  const setup = $derived(auth.needsSetup);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      if (setup) await auth.setup(email, password);
      else await auth.login(email, password);
    } catch (err) {
      error = errorText(err);
      if (err instanceof ApiError && err.code === 'already_set_up') auth.needsSetup = false;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{setup ? t('auth.setupTitle') : t('auth.loginTitle')} · coin-book</title></svelte:head>

<main class="login">
  <div class="stripes" aria-hidden="true">
    <span style="--c: var(--cat-malina); --w: 74%"></span>
    <span style="--c: var(--cat-slunecnice); --w: 52%"></span>
    <span style="--c: var(--cat-smaragd); --w: 63%"></span>
    <span style="--c: var(--cat-chrpa); --w: 41%"></span>
    <span style="--c: var(--cat-mandarinka); --w: 30%"></span>
  </div>
  <form class="card" onsubmit={submit}>
    <h1 class="display">{setup ? t('auth.setupTitle') : t('auth.loginTitle')}</h1>
    {#if setup}<p class="lead">{t('auth.setupLead')}</p>{/if}
    <label>
      <span>{t('auth.email')}</span>
      <input type="email" autocomplete="username" required bind:value={email} />
    </label>
    <label>
      <span>{t('auth.password')}</span>
      <input
        type="password"
        autocomplete={setup ? 'new-password' : 'current-password'}
        required
        minlength={setup ? 10 : undefined}
        bind:value={password}
      />
      {#if setup}<small>{t('auth.passwordHint')}</small>{/if}
    </label>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <Button type="submit" {busy}>{setup ? t('auth.setup') : t('auth.login')}</Button>
  </form>
</main>

<style>
  .login {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: 1fr minmax(320px, 420px) 1fr;
    align-items: center;
    padding: 24px 16px;
    position: relative;
    overflow: hidden;
  }
  .stripes {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    display: grid;
    gap: 14px;
    pointer-events: none;
  }
  .stripes span {
    height: 34px;
    width: var(--w);
    border-radius: 0 999px 999px 0;
    background: var(--c);
    opacity: 0.9;
  }
  .card {
    grid-column: 2;
    position: relative;
    display: grid;
    gap: 16px;
    padding: 32px;
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow-float);
  }
  h1 {
    margin: 0;
    font-size: var(--text-headline);
  }
  .lead {
    margin: -6px 0 4px;
    color: var(--ink-soft);
  }
  label {
    display: grid;
    gap: 6px;
    font-weight: 600;
    font-size: var(--text-micro);
  }
  input {
    padding: 11px 12px;
    border-radius: var(--radius-input);
    border: 1.5px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-size: var(--text-body);
  }
  input:focus {
    border-color: var(--brand);
    outline: none;
  }
  small {
    font-weight: 400;
    color: var(--ink-faint);
  }
  .error {
    margin: 0;
    color: var(--over);
    font-weight: 600;
  }
  @media (max-width: 640px) {
    .login {
      grid-template-columns: 1fr;
    }
    .card {
      grid-column: 1;
      padding: 24px;
    }
  }
</style>
