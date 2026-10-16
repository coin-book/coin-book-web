import type { Locale } from '../i18n.svelte';

type ErrorMessages = Record<string, string>;

// Keyed by the API's apierr.Code values (coin-book-api/internal/transport/http/apierr).
const cs: ErrorMessages = {
  validation_failed: 'Některé údaje nejsou vyplněné správně.',
  invalid_request_body: 'Požadavek se nepodařilo přečíst.',
  auth_required: 'Přihlášení vypršelo. Přihlaste se znovu.',
  forbidden: 'K tomu nemáte přístup.',
  not_found: 'Hledaná položka už neexistuje.',
  rate_limited: 'Příliš mnoho pokusů. Chvíli počkejte a zkuste to znovu.',
  internal_error: 'Akci se nepodařilo dokončit. Zkuste to znovu.',
  host_not_allowed: 'Aplikace musí běžet na localhost.',
  invalid_credentials: 'E-mail nebo heslo nesedí.',
  password_too_short: 'Heslo musí mít alespoň 10 znaků.',
  already_set_up: 'Uživatel už existuje. Přihlaste se.',
  session_required: 'Tuto akci může udělat jen přihlášený uživatel, ne agent.',
  insufficient_scope: 'Token agenta na tato data nemá oprávnění.',
  unknown_scope: 'Neznámé oprávnění tokenu.',
  token_ttl_too_long: 'Token může platit nejvýš rok.',
  unsupported_format:
    'Tento soubor neumím přečíst. Podporuji CSV z mBank CZ a slovenský konsolidovaný výpis Revolut.',
  balance_mismatch: 'Výpis nesouhlasí se svými kontrolními součty.',
  already_imported: 'Tento soubor už je naimportovaný.',
  already_rolled_back: 'Import už byl vrácen.',
  file_too_large: 'Soubor je příliš velký.',
  split_mismatch: 'Části rozdělení se musí sečíst na částku transakce.',
  nothing_to_match: 'Transakce nemá protistranu, podle které by šlo pravidlo uložit.',
  not_pairable: 'Tyto dvě transakce nemohou tvořit převod.',
  not_paired: 'Transakce není součástí převodu.',
  invalid_budget_line: 'Řádek rozpočtu potřebuje kategorii a nezápornou částku.',
  duplicate_budget_line: 'Kategorie je v rozpočtu dvakrát.',
  invalid_currency: 'Neznámá měna.',
  invalid_cursor: 'Stránkování se rozbilo. Načtěte stránku znovu.',
  network: 'Server neodpovídá. Běží coin-book-local?',
};

const sk: ErrorMessages = {
  validation_failed: 'Niektoré údaje nie sú vyplnené správne.',
  invalid_request_body: 'Požiadavku sa nepodarilo prečítať.',
  auth_required: 'Prihlásenie vypršalo. Prihláste sa znova.',
  forbidden: 'K tomu nemáte prístup.',
  not_found: 'Hľadaná položka už neexistuje.',
  rate_limited: 'Príliš veľa pokusov. Chvíľu počkajte a skúste to znova.',
  internal_error: 'Akciu sa nepodarilo dokončiť. Skúste to znova.',
  host_not_allowed: 'Aplikácia musí bežať na localhost.',
  invalid_credentials: 'E-mail alebo heslo nesedí.',
  password_too_short: 'Heslo musí mať aspoň 10 znakov.',
  already_set_up: 'Používateľ už existuje. Prihláste sa.',
  session_required: 'Túto akciu môže urobiť len prihlásený používateľ, nie agent.',
  insufficient_scope: 'Token agenta na tieto dáta nemá oprávnenie.',
  unknown_scope: 'Neznáme oprávnenie tokenu.',
  token_ttl_too_long: 'Token môže platiť najviac rok.',
  unsupported_format:
    'Tento súbor neviem prečítať. Podporujem CSV z mBank CZ a slovenský konsolidovaný výpis Revolut.',
  balance_mismatch: 'Výpis nesúhlasí so svojimi kontrolnými súčtami.',
  already_imported: 'Tento súbor už je naimportovaný.',
  already_rolled_back: 'Import už bol vrátený.',
  file_too_large: 'Súbor je príliš veľký.',
  split_mismatch: 'Časti rozdelenia sa musia sčítať na sumu transakcie.',
  nothing_to_match: 'Transakcia nemá protistranu, podľa ktorej by sa dalo pravidlo uložiť.',
  not_pairable: 'Tieto dve transakcie nemôžu tvoriť prevod.',
  not_paired: 'Transakcia nie je súčasťou prevodu.',
  invalid_budget_line: 'Riadok rozpočtu potrebuje kategóriu a nezápornú sumu.',
  duplicate_budget_line: 'Kategória je v rozpočte dvakrát.',
  invalid_currency: 'Neznáma mena.',
  invalid_cursor: 'Stránkovanie sa pokazilo. Načítajte stránku znova.',
  network: 'Server neodpovedá. Beží coin-book-local?',
};

export const errorMessages: Record<Locale, ErrorMessages> = { cs, sk };
