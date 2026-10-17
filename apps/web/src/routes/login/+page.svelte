<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '@coin-book/core/auth';
  import { errorText } from '@coin-book/core/errors';
  import { apiErrorMessage, t } from '@coin-book/core/i18n';
  import Button from '@coin-book/ui/Button.svelte';

  let registering = $state(false);
  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  // The Google callback lands here with ?error=<api code> when the sign-in did not complete.
  let error = $state(codeFromQuery(page.url.searchParams.get('error')));

  function codeFromQuery(code: string | null) {
    return code ? apiErrorMessage(code) : '';
  }

  function switchMode() {
    registering = !registering;
    error = '';
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      if (registering) await auth.register(email, password);
      else await auth.login(email, password);
    } catch (err) {
      error = errorText(err);
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>{registering ? t('auth.registerTitle') : t('auth.loginTitle')} · coin-book</title></svelte:head
>

<main class="login">
  <div class="stripes" aria-hidden="true">
    <span style="--c: var(--cat-malina); --w: 74%"></span>
    <span style="--c: var(--cat-slunecnice); --w: 52%"></span>
    <span style="--c: var(--cat-smaragd); --w: 63%"></span>
    <span style="--c: var(--cat-chrpa); --w: 41%"></span>
    <span style="--c: var(--cat-mandarinka); --w: 30%"></span>
  </div>
  <form class="card" onsubmit={submit}>
    <h1 class="display">{registering ? t('auth.registerTitle') : t('auth.loginTitle')}</h1>
    {#if registering}<p class="lead">{t('auth.registerLead')}</p>{/if}
    {#if auth.google}
      <Button variant="quiet" icon="google-logo" href={auth.googleSignInUrl}>{t('auth.google')}</Button>
      <p class="or" aria-hidden="true"><span>{t('auth.or')}</span></p>
    {/if}
    <label>
      <span>{t('auth.email')}</span>
      <input type="email" autocomplete="username" required bind:value={email} />
    </label>
    <label>
      <span>{t('auth.password')}</span>
      <input
        type="password"
        autocomplete={registering ? 'new-password' : 'current-password'}
        required
        minlength={registering ? 10 : undefined}
        bind:value={password}
      />
      {#if registering}<small>{t('auth.passwordHint')}</small>{/if}
    </label>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <Button type="submit" {busy}>{registering ? t('auth.register') : t('auth.login')}</Button>
    <button type="button" class="switch" onclick={switchMode}>
      {registering ? t('auth.toLogin') : t('auth.toRegister')}
    </button>
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
  .or {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 10px;
    margin: -4px 0;
    color: var(--ink-faint);
    font-size: var(--text-micro);
  }
  .or::before,
  .or::after {
    content: '';
    height: 1px;
    background: var(--line);
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
  .switch {
    justify-self: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: var(--text-micro);
    text-decoration: underline;
    cursor: pointer;
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
