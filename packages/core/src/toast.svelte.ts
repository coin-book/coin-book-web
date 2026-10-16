export type ToastTone = 'info' | 'success' | 'error';

export type Toast = { id: number; message: string; tone: ToastTone; colorKey?: string };

const TOAST_MS = 4200;

class Toasts {
  items = $state<Toast[]>([]);
  #next = 1;

  show(message: string, tone: ToastTone = 'info', colorKey?: string) {
    const id = this.#next++;
    this.items.push({ id, message, tone, colorKey });
    setTimeout(() => this.dismiss(id), TOAST_MS);
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
