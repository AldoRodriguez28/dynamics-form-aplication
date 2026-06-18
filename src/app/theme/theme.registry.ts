import { ThemeConfig } from './theme-config';
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';

export const DEFAULT_ORIGIN = 'default';

export const THEME_REGISTRY: Record<string, ThemeConfig> = {
  [DEFAULT_THEME.origin]: DEFAULT_THEME,
  [BRANDX_THEME.origin]: BRANDX_THEME,
};
