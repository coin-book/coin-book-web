<script lang="ts">
  import { api } from '@coin-book/core/api';
  import { shortDate, todayISO } from '@coin-book/core/dates';
  import { errorText } from '@coin-book/core/errors';
  import { t, type MessageKey } from '@coin-book/core/i18n';
  import { annuityMinor, instalmentsUntil } from '@coin-book/core/loan';
  import { monthsUntil } from '@coin-book/core/networth';
  import { formatPercent, formatWhole, parseMinor } from '@coin-book/core/money';
  import { taxonomy } from '@coin-book/core/taxonomy';
  import { toasts } from '@coin-book/core/toast';
  import type {
    Account,
    AccountValuation,
    LoanInstalment,
    LoanOverview,
    LoanPaymentRow,
    LoanTerms,
    Prepayment,
  } from '@coin-book/core/types';
  import AreaChart, { type AreaPoint } from '@coin-book/ui/AreaChart.svelte';
  import Button from '@coin-book/ui/Button.svelte';
  import MoneyAmount from '@coin-book/ui/MoneyAmount.svelte';
  import ValuationForm from '$lib/ValuationForm.svelte';

  let { account }: { account: Account } = $props();

  const currency = $derived(account.currency);

  let overview = $state<LoanOverview | null>(null);
  let instalments = $state<LoanInstalment[]>([]);
  let balances = $state<AccountValuation[]>([]);
  let error = $state('');
  let showSchedule = $state(false);
  let addingTerms = $state(false);

  let validFrom = $state(todayISO());
  let balance = $state('');
  let rate = $state('');
  let payment = $state('');
  let paymentDay = $state(15);
  let maturity = $state('');
  let fixedUntil = $state('');
  let savingTerms = $state(false);

  let extra = $state('');
  let prepayment = $state<Prepayment | null>(null);

  async function load() {
    try {
      const [o, s, b] = await Promise.all([
        api.get<LoanOverview>(`/loans/${account.id}`),
        api.get<{ instalments: LoanInstalment[] }>(`/loans/${account.id}/schedule`),
        api.get<{ valuations: AccountValuation[] }>(`/accounts/${account.id}/valuations`),
      ]);
      overview = o;
      instalments = s.instalments;
      balances = b.valuations;
      if (o.terms.length === 0) addingTerms = true;
    } catch (e) {
      error = errorText(e);
    }
  }

  $effect(() => {
    void load();
  });

  function decimal(minor: number) {
    return (minor / 100).toString().replace('.', ',');
  }

  /** A refixation starts from today's balance and the current terms. */
  function startTerms() {
    const current = overview?.current;
    validFrom = todayISO();
    balance = overview && overview.balance.minor > 0 ? decimal(overview.balance.minor) : '';
    rate = current?.annual_rate.replace('.', ',') ?? '';
    payment = current ? decimal(current.payment.minor) : '';
    paymentDay = current?.payment_day ?? 15;
    maturity = current?.maturity_on ?? '';
    fixedUntil = '';
    addingTerms = true;
  }

  const suggestedPayment = $derived.by(() => {
    const balanceMinor = parseMinor(balance, currency);
    const percent = Number(rate.replace(',', '.'));
    if (!balanceMinor || !maturity || !Number.isFinite(percent)) return 0;
    return annuityMinor(balanceMinor, percent, instalmentsUntil(validFrom, maturity, paymentDay));
  });

  async function saveTerms(e: SubmitEvent) {
    e.preventDefault();
    const balanceMinor = parseMinor(balance, currency);
    const paymentMinor = parseMinor(payment, currency);
    if (!balanceMinor || !paymentMinor) {
      toasts.show(t('accounts.openingHint'), 'error');
      return;
    }
    savingTerms = true;
    try {
      await api.put(`/loans/${account.id}/terms/${validFrom}`, {
        balance_minor: balanceMinor,
        annual_rate: rate.replace(',', '.').trim(),
        payment_minor: paymentMinor,
        payment_day: paymentDay,
        maturity_on: maturity,
        fixed_until: fixedUntil || undefined,
      });
      toasts.show(t('loan.termsSaved'), 'success');
      addingTerms = false;
      prepayment = null;
      await load();
    } catch (err) {
      toasts.show(errorText(err), 'error');
    } finally {
      savingTerms = false;
    }
  }

  async function deleteTerms(terms: LoanTerms) {
    try {
      await api.delete(`/loans/${account.id}/terms/${terms.valid_from}`);
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  let splitting = $state<string | null>(null);
  let splitInterest = $state('');

  function startSplit(p: LoanPaymentRow) {
    splitting = p.transaction_id;
    splitInterest = decimal(p.interest.minor);
  }

  /** A split of the user's own; without one the payment follows the schedule again. */
  async function saveSplit(p: LoanPaymentRow, own: boolean) {
    const body: Record<string, unknown> = { account_id: account.id };
    if (own) {
      const interest = parseMinor(splitInterest, currency);
      if (interest === null || interest < 0 || interest > p.amount.minor) {
        toasts.show(t('accounts.openingHint'), 'error');
        return;
      }
      body.interest_minor = interest;
      body.principal_minor = p.amount.minor - interest;
    }
    try {
      await api.put(`/transactions/${p.transaction_id}/loan-payment`, body);
      toasts.show(t('loan.splitSaved'), 'success');
      splitting = null;
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  let enablingReserve = $state(false);

  async function enableReserve() {
    enablingReserve = true;
    try {
      await api.post(`/loans/${account.id}/reserve`);
      await taxonomy.reloadAccounts();
      toasts.show(t('loan.reserveCreated'), 'success');
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    } finally {
      enablingReserve = false;
    }
  }

  async function unmark(p: LoanPaymentRow) {
    try {
      await api.delete(`/transactions/${p.transaction_id}/loan-payment`);
      toasts.show(t('loanPayment.undone'), 'success');
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  async function removeBalance(v: AccountValuation) {
    try {
      await api.delete(`/accounts/${account.id}/valuations/${v.id}`);
      await load();
    } catch (e) {
      toasts.show(errorText(e), 'error');
    }
  }

  async function simulate(e: SubmitEvent) {
    e.preventDefault();
    const minor = parseMinor(extra, currency);
    if (!minor || minor <= 0) return;
    try {
      prepayment = await api.get<Prepayment>(`/loans/${account.id}/prepayment`, { extra_minor: minor });
    } catch (err) {
      toasts.show(errorText(err), 'error');
    }
  }

  const points = $derived<AreaPoint[]>(
    instalments.map((i) => ({
      key: i.due_on,
      label: shortDate(i.due_on),
      valueMinor: i.balance.minor,
      details: [
        { label: t('loan.interest'), valueMinor: i.interest.minor },
        { label: t('loan.principal'), valueMinor: i.principal.minor },
      ],
    })),
  );
  const isMortgage = $derived(account.kind === 'mortgage');
</script>

{#if error}
  <p class="error" role="alert">{error}</p>
{:else if overview}
  <section class="kpis" data-testid="loan-kpis">
    <div class="kpi main">
      <h2>{t('loan.balance')}</h2>
      <MoneyAmount amount={overview.balance} size="hero" whole />
      {#if overview.paid_off_on}<p class="quiet small">
          {t('loan.paidOffOn', { date: shortDate(overview.paid_off_on) })}
        </p>{/if}
    </div>
    <div class="kpi">
      <h2>{t('loan.next')}</h2>
      {#if overview.next}
        <MoneyAmount
          amount={{ minor: overview.next.interest.minor + overview.next.principal.minor, currency }}
          size="lg"
        />
        <span class="quiet small"
          >{t('loan.nextSplit', {
            date: shortDate(overview.next.due_on),
            interest: formatWhole(overview.next.interest.minor, currency),
            principal: formatWhole(overview.next.principal.minor, currency),
          })}</span
        >
      {:else}<span class="quiet">—</span>{/if}
    </div>
    <div class="kpi" data-testid="loan-rate">
      <h2>{t('loan.rate')}</h2>
      {#if overview.current}
        <strong class="big">{formatPercent(overview.current.annual_rate)}</strong>
        <span class="quiet small">
          {#if overview.current.fixed_until}
            {t('loan.fixation')}
            {shortDate(overview.current.fixed_until)} ·
            {monthsUntil(overview.current.fixed_until) > 0
              ? t('loan.fixationLeft', { months: monthsUntil(overview.current.fixed_until) })
              : t('loan.fixationOver')}
          {:else}
            {t('loan.noFixation')}
          {/if}
        </span>
      {:else}<span class="quiet">—</span>{/if}
    </div>
    <div class="kpi">
      <h2>{t('loan.remainingInterest')}</h2>
      <MoneyAmount amount={overview.remaining_interest} size="lg" whole />
      <span class="quiet small">{t('loan.remainingMonths', { months: overview.remaining_months })}</span>
    </div>
  </section>

  {#if overview.terms.length === 0}
    <p class="notice">{t('loan.noTerms')}</p>
  {:else}
    <section class="panel">
      <h2>{t('loan.balanceChart')}</h2>
      <AreaChart
        {points}
        {currency}
        label={t('loan.balanceChart')}
        valueLabel={t('loan.balance')}
        keyLabel={t('loan.dueOn')}
        tableLabel={t('netWorth.asTable')}
        chartLabel={t('netWorth.asChart')}
        maxAxisLabels={6}
      />
    </section>
  {/if}

  <div class="columns">
    <section class="panel" data-testid="loan-payments">
      <h2>{t('loan.payments')}</h2>
      <p class="quiet small lead">{t('loan.paymentsLead')}</p>
      {#if overview.payments.length === 0}
        <p class="quiet">{t('loan.bankHint')}</p>
      {:else}
        <ul class="rows">
          {#each overview.payments as p (p.transaction_id)}
            <li data-testid="loan-payment" data-tx={p.transaction_id}>
              <span>{shortDate(p.booked_on)}</span>
              <span class="split">
                <MoneyAmount amount={p.amount} />
                <span class="quiet small"
                  >{t('loanPayment.split', {
                    interest: formatWhole(p.interest.minor, currency),
                    principal: formatWhole(p.principal.minor, currency),
                  })}{#if !p.by_schedule}
                    · {t('loan.ownSplit')}{/if}</span
                >
              </span>
              <span class="row-actions">
                <Button variant="ghost" onclick={() => startSplit(p)}>{t('loan.editSplit')}</Button>
                <Button variant="ghost" onclick={() => unmark(p)}>{t('loan.unmark')}</Button>
              </span>
              {#if splitting === p.transaction_id}
                <form
                  class="inline split-form"
                  onsubmit={(e) => {
                    e.preventDefault();
                    void saveSplit(p, true);
                  }}
                >
                  <label class="field">
                    <span>{t('loan.interest')} ({currency})</span>
                    <input bind:value={splitInterest} inputmode="decimal" required />
                  </label>
                  <Button type="submit" variant="quiet">{t('common.save')}</Button>
                  {#if !p.by_schedule}
                    <Button variant="ghost" type="button" onclick={() => saveSplit(p, false)}
                      >{t('loan.bySchedule')}</Button
                    >
                  {/if}
                </form>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="panel" data-testid="prepayment">
      <h2>{t('loan.prepayment')}</h2>
      <p class="quiet small lead">{t('loan.prepaymentLead')}</p>
      {#if overview.reserve}<p class="quiet small lead">{t('loan.reservePrepayment')}</p>{/if}
      {#if overview.current && overview.balance.minor > 0}
        <form class="inline" onsubmit={simulate}>
          <label class="field">
            <span>{t('loan.extra')} ({currency})</span>
            <input bind:value={extra} inputmode="decimal" placeholder="100 000" required />
          </label>
          <Button type="submit" variant="quiet">{t('loan.simulate')}</Button>
        </form>
        {#if prepayment}
          <div class="scenarios">
            <div class="scenario">
              <h3>{t('loan.keepPayment')}</h3>
              <p>
                {t('loan.keepPaymentLead', {
                  payment: formatWhole(prepayment.keep_payment.payment.minor, currency),
                  date: shortDate(prepayment.keep_payment.paid_off_on),
                  months: prepayment.current.months - prepayment.keep_payment.months,
                })}
              </p>
              <strong
                >{t('loan.saves', {
                  amount: formatWhole(
                    prepayment.current.interest.minor - prepayment.keep_payment.interest.minor,
                    currency,
                  ),
                })}</strong
              >
            </div>
            <div class="scenario">
              <h3>{t('loan.keepMaturity')}</h3>
              <p>
                {t('loan.keepMaturityLead', {
                  payment: formatWhole(prepayment.keep_maturity.payment.minor, currency),
                  date: shortDate(prepayment.keep_maturity.paid_off_on),
                })}
              </p>
              <strong
                >{t('loan.saves', {
                  amount: formatWhole(
                    prepayment.current.interest.minor - prepayment.keep_maturity.interest.minor,
                    currency,
                  ),
                })}</strong
              >
            </div>
          </div>
        {/if}
      {:else}
        <p class="quiet">{t('loan.noTerms')}</p>
      {/if}
    </section>
  </div>

  {#if isMortgage}
    <section class="panel" data-testid="loan-reserve">
      <div class="panel-head">
        <h2>{t('loan.reserveTitle')}</h2>
        {#if !overview.reserve}
          <Button variant="quiet" icon="piggy-bank" busy={enablingReserve} onclick={enableReserve}
            >{t('loan.enableReserve')}</Button
          >
        {/if}
      </div>
      <p class="quiet small lead">{t('loan.reserveLead')}</p>
      {#if overview.reserve}
        {@const reserve = overview.reserve}
        <div class="reserve-figures">
          <div>
            <span class="label">{t('loan.reserveBalance')}</span>
            <MoneyAmount amount={reserve.balance} size="lg" whole />
          </div>
          <div>
            <span class="label">{t('loan.reserveSaved')}</span>
            <MoneyAmount amount={reserve.saved} size="lg" gain whole />
          </div>
          <div>
            <span class="label">{t('loan.reserveSaves')}</span>
            <MoneyAmount amount={reserve.saves} size="lg" gain whole />
            {#if reserve.paid_off_on && reserve.paid_off_without_on && reserve.paid_off_on < reserve.paid_off_without_on}
              <span class="quiet small"
                >{t('loan.reserveSooner', {
                  date: shortDate(reserve.paid_off_on),
                  months: monthsUntil(reserve.paid_off_without_on, reserve.paid_off_on),
                })}</span
              >
            {/if}
          </div>
        </div>
        <p class="quiet small">{t('loan.reserveHint')}</p>
        <h3 class="sub">{t('loan.reserveStatement')}</h3>
        <ValuationForm accountId={reserve.account_id} {currency} onsaved={load} />
      {/if}
    </section>
  {/if}

  {#if isMortgage && overview.years.length > 0}
    <section class="panel" data-testid="loan-tax">
      <h2>{t('loan.tax')}</h2>
      <p class="quiet small lead">{t('loan.taxLead')}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{t('loan.year')}</th>
            <th scope="col" class="num">{t('loan.interestPaid')}</th>
            <th scope="col" class="num">{t('loan.deductible')}</th>
          </tr>
        </thead>
        <tbody>
          {#each overview.years as y (y.year)}
            <tr>
              <th scope="row">{y.year}</th>
              <td class="num"><MoneyAmount amount={y.interest} /></td>
              <td class="num"><MoneyAmount amount={y.deductible} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  <section class="panel" data-testid="loan-terms">
    <div class="panel-head">
      <h2>{t('loan.terms')}</h2>
      {#if overview.terms.length > 0 && !addingTerms}
        <Button variant="quiet" icon="plus" onclick={startTerms}>{t('loan.addTerms')}</Button>
      {/if}
    </div>
    <p class="quiet small lead">{t('loan.termsLead')}</p>
    {#if overview.terms.length > 0}
      <table>
        <thead>
          <tr>
            <th scope="col">{t('loan.validFrom')}</th>
            <th scope="col" class="num">{t('loan.balanceAt')}</th>
            <th scope="col" class="num">{t('loan.rate')}</th>
            <th scope="col" class="num">{t('loan.payment')}</th>
            <th scope="col">{t('loan.maturity')}</th>
            <th scope="col">{t('loan.fixedUntil')}</th>
            <th scope="col"><span class="sr-only">{t('loan.deleteTerms')}</span></th>
          </tr>
        </thead>
        <tbody>
          {#each overview.terms as terms (terms.valid_from)}
            <tr>
              <th scope="row">{shortDate(terms.valid_from)}</th>
              <td class="num"><MoneyAmount amount={terms.balance} whole /></td>
              <td class="num">{formatPercent(terms.annual_rate, 4)}</td>
              <td class="num"><MoneyAmount amount={terms.payment} /></td>
              <td>{shortDate(terms.maturity_on)}</td>
              <td>{terms.fixed_until ? shortDate(terms.fixed_until) : '—'}</td>
              <td
                ><Button
                  variant="ghost"
                  icon="trash"
                  aria-label={t('loan.deleteTerms')}
                  onclick={() => deleteTerms(terms)}>{t('common.delete')}</Button
                ></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
    {#if addingTerms}
      <form class="terms-form" onsubmit={saveTerms} data-testid="loan-terms-form">
        <label class="field">
          <span>{t('loan.validFrom')}</span>
          <input type="date" bind:value={validFrom} required />
        </label>
        <label class="field">
          <span>{t('loan.balanceAt')} ({currency})</span>
          <input bind:value={balance} inputmode="decimal" required />
        </label>
        <label class="field">
          <span>{t('loan.annualRate')}</span>
          <input
            bind:value={rate}
            inputmode="decimal"
            required
            pattern="[0-9]{'{'}1,2{'}'}([.,][0-9]{'{'}1,4{'}'})?"
          />
        </label>
        <label class="field">
          <span>{t('loan.maturity')}</span>
          <input type="date" bind:value={maturity} required />
        </label>
        <label class="field">
          <span>{t('loan.payment')} ({currency})</span>
          <input bind:value={payment} inputmode="decimal" required />
          {#if suggestedPayment > 0}
            <small
              >{t('loan.annuity', { amount: formatWhole(suggestedPayment, currency) })}
              <button type="button" class="link" onclick={() => (payment = decimal(suggestedPayment))}
                >{t('loan.useAnnuity')}</button
              ></small
            >
          {/if}
        </label>
        <label class="field">
          <span>{t('loan.paymentDay')}</span>
          <input type="number" bind:value={paymentDay} min="1" max="31" required />
        </label>
        <label class="field">
          <span>{t('loan.fixedUntil')}</span>
          <input type="date" bind:value={fixedUntil} />
        </label>
        <div class="actions">
          {#if overview.terms.length > 0}
            <Button variant="ghost" type="button" onclick={() => (addingTerms = false)}
              >{t('common.cancel')}</Button
            >
          {/if}
          <Button type="submit" busy={savingTerms}>{t('loan.saveTerms')}</Button>
        </div>
      </form>
    {/if}
  </section>

  {#if instalments.length > 0}
    <section class="panel" data-testid="loan-schedule">
      <div class="panel-head">
        <h2>{t('loan.schedule')}</h2>
        <Button variant="ghost" onclick={() => (showSchedule = !showSchedule)}
          >{showSchedule ? t('loan.hideSchedule') : t('loan.showSchedule')}</Button
        >
      </div>
      {#if showSchedule}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('loan.dueOn')}</th>
                <th scope="col" class="num">{t('loan.interest')}</th>
                <th scope="col" class="num">{t('loan.principal')}</th>
                <th scope="col" class="num">{t('loan.balance')}</th>
                <th scope="col">{t('p2p.status')}</th>
              </tr>
            </thead>
            <tbody>
              {#each instalments as i (i.due_on)}
                <tr class={i.status}>
                  <th scope="row">{shortDate(i.due_on)}</th>
                  <td class="num"><MoneyAmount amount={i.interest} /></td>
                  <td class="num"><MoneyAmount amount={i.principal} /></td>
                  <td class="num"><MoneyAmount amount={i.balance} whole /></td>
                  <td class="quiet">{t(`loan.status.${i.status}` as MessageKey)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}

  <section class="panel" data-testid="loan-balances">
    <h2>{t('valuation.loanTitle')}</h2>
    <ValuationForm accountId={account.id} {currency} loan onsaved={load} />
    {#if balances.length > 0}
      <ul class="rows">
        {#each balances as v (v.id)}
          <li>
            <span>{shortDate(v.valued_on)}</span>
            <span class="split"
              ><MoneyAmount amount={v.value} /><span class="quiet small">{v.note}</span></span
            >
            <Button
              variant="ghost"
              icon="trash"
              aria-label={t('valuation.delete')}
              onclick={() => removeBalance(v)}>{t('common.delete')}</Button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{:else}
  <p class="quiet">{t('common.loading')}</p>
{/if}

<style>
  .kpis {
    display: grid;
    grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 18px 20px;
  }
  .kpi h2 {
    margin: 0 0 4px;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .kpi p {
    margin: 4px 0 0;
  }
  .big {
    font-size: var(--text-title);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .notice {
    border-left: 3px solid var(--warn);
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 14px 18px;
    margin: 0 0 18px;
  }
  .panel {
    background: var(--surface);
    border-radius: var(--radius-panel);
    padding: 22px 24px;
    margin-bottom: 18px;
  }
  .panel h2 {
    margin: 0 0 6px;
    font-size: var(--text-body);
    font-weight: 650;
    color: var(--ink-soft);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .lead {
    margin: 0 0 12px;
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 18px;
  }
  .rows {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .rows li {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--line);
  }
  .split {
    display: flex;
    flex-direction: column;
  }
  .reserve-figures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    margin: 4px 0 12px;
  }
  .reserve-figures > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .label {
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .sub {
    margin: 14px 0 0;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  .row-actions {
    display: flex;
    gap: 4px;
  }
  .split-form {
    grid-column: 1 / -1;
  }
  .inline,
  .terms-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 14px;
  }
  .terms-form {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: var(--text-micro);
    color: var(--ink-soft);
  }
  .field input {
    font: inherit;
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--surface);
    color: var(--ink);
    width: 150px;
  }
  .field small {
    color: var(--ink-faint);
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--brand);
    font-weight: 650;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  .scenarios {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 14px;
  }
  .scenario {
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
  }
  .scenario h3 {
    margin: 0 0 4px;
    font-size: var(--text-body);
  }
  .scenario p {
    margin: 0 0 8px;
    color: var(--ink-soft);
    font-size: var(--text-micro);
  }
  .scenario strong {
    color: var(--income);
  }
  .table-wrap {
    overflow-x: auto;
    max-height: 480px;
    overflow-y: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 7px 6px;
    border-top: 1px solid var(--line);
    font-weight: 500;
  }
  thead th {
    border-top: 0;
    font-size: var(--text-micro);
    font-weight: 650;
    color: var(--ink-faint);
  }
  tr.projected {
    color: var(--ink-soft);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .quiet {
    color: var(--ink-soft);
  }
  .small {
    font-size: var(--text-micro);
  }
  .error {
    color: var(--over);
    font-weight: 600;
  }
  @media (max-width: 1100px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kpi.main {
      grid-column: 1 / -1;
    }
    .columns,
    .scenarios {
      grid-template-columns: 1fr;
    }
  }
</style>
