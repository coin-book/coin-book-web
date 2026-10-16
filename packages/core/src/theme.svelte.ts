export type ThemeChoice = 'system' | 'light' | 'dark';

const THEME_KEY = 'coinbook.theme';

class Theme {
  choice = $state<ThemeChoice>('system');

  init() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') this.choice = stored;
    } catch {
      // Storage blocked: follow the system.
    }
    this.#apply();
  }

  set(choice: ThemeChoice) {
    this.choice = choice;
    try {
      localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Applied for this visit only.
    }
    this.#apply();
  }

  #apply() {
    const root = document.documentElement;
    if (this.choice === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = this.choice;
  }
}

export const theme = new Theme();
