export type Theme = 'dark' | 'light' | 'solar' | 'forest';
export const FREE_THEMES: Theme[] = ['dark', 'light'];
export const PRO_THEMES: Theme[] = ['solar', 'forest'];
export const ALL_THEMES: Theme[] = [...FREE_THEMES, ...PRO_THEMES];

export function isProTheme(theme: Theme): boolean {
  return PRO_THEMES.includes(theme);
}
export type GameMode = 'mcq' | 'code-review';

export interface SessionPreferences {
  theme: Theme;
  defaultStartingMode: GameMode | null;
  reducedMotion: boolean | 'system';
  /** ISO date (YYYY-MM-DD) of the user's scheduled AI-103 exam. Pro-only. */
  examDate: string | null;
}

export const DEFAULT_PREFERENCES: SessionPreferences = {
  theme: 'dark',
  defaultStartingMode: null,
  reducedMotion: 'system',
  examDate: null,
};
