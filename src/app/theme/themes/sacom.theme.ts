import { ThemeConfig } from '../theme-config';

export const SACOM_THEME: ThemeConfig = {
  origin: 'sacom',
  layoutKey: 'sacom',
  cssVars: {
    '--color-primary': '#FFD800',
    '--color-primary-dark': '#E5C200',
    '--color-primary-tint': '#FFFBEB',
    '--color-bg': '#F4F4F4',
    '--color-surface': '#FFFFFF',
    '--color-text': '#1A1A1A',
    '--color-text-light': '#666666',
    '--color-text-muted': '#767676',
    '--color-border': '#E5E5E5',
    '--color-action': '#1A1A1A',
    '--color-action-hover': '#2D2D2D',
    '--color-danger': '#DC2626',
    '--color-success': '#16A34A',
    '--color-hero-tint': '#FEF9C3',
    '--font-family': "'Inter', Arial, sans-serif",
    '--radius-md': '8px',
    '--radius-lg': '12px',
    '--radius-full': '9999px',
  },
  logoUrl: '/assets/brands/sacom/logo.svg',
  brandName: 'SACOM',
};
