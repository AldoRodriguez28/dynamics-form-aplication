export interface ThemeConfig {
  /** Clave que matchea el claim `origin` del JWT, normalizada (minúsculas/trim). */
  origin: string;
  /** Clave del shell a usar (ver LAYOUT_REGISTRY). */
  layoutKey: string;
  /** Overrides de variables CSS aplicadas en runtime sobre :root. */
  cssVars: Record<string, string>;
  logoUrl?: string;
  brandName?: string;
}
