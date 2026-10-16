import { ApiError } from './api';
import { apiErrorMessage } from './i18n.svelte';

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return apiErrorMessage('internal_error');
}
