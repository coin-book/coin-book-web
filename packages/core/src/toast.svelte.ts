export type ToastTone = 'info' | 'success' | 'error';

export type ToastAction = { label: string; run: () => void | Promise<void> };

export type Toast = { id: number; message: string; tone: ToastTone; colorKey?: string; action?: ToastAction };

const TOAST_MS = 4200;
// A toast that offers an action stays long enough to read and decide.
const ACTION_TOAST_MS = 10000;

class Toasts {
  items = $state<Toast[]>([]);
  #next = 1;

  show(message: string, tone: ToastTone = 'info', colorKey?: string, action?: ToastAction) {
    const id = this.#next++;
    this.items.push({ id, message, tone, colorKey, action });
    setTimeout(() => this.dismiss(id), action ? ACTION_TOAST_MS : TOAST_MS);
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
