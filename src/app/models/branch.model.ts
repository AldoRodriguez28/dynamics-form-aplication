export interface Branch {
  nombreSucursal?: string | null;
  telefonoSucursal?: string | null;
  direccionSucursal?: string | null;
  /**
   * Permite campos adicionales sin romper si el JSON trae más propiedades.
   */
  [key: string]: string | null | undefined;
}
