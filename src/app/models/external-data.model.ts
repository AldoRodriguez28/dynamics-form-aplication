export interface ExternalProduct {
  productId?: string | number;
  productCode?: string;
  productName?: string;
  renewal?: string;
}

export interface ExternalData {
  contractId?: string;
  renewal?: string;
  products?: ExternalProduct[];
  _display?: Record<string, unknown>;
}
