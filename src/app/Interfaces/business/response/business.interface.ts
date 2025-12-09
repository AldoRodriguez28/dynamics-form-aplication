export interface BusinessInterface {
  businessId?: number | null;
  BusinessVersion?: number | null;
  commercialName?: string | null;
  categoryCode?: string | null;
  townCode?: string | null;
  state?: string | null;
  lastUpdate?: string | Date | null;
  ExternalData?: string | null;
}