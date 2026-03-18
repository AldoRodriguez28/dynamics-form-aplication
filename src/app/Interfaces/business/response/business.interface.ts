import { ExternalReferenceInterface } from "./external-reference.interface";

export interface BusinessInterface {
  businessId?: number | null;
  businessVersion?: number | null;
  versionNumber?: number | null;
  commercialName?: string | null;
  categoryCode?: string | null;
  townCode?: string | null;
  categoryName?: string | null;
  townName?: string | null;
  state?: string | null;
  lastUpdate?: string | Date | null;
  externalData?: string | null;
  externalReference?:ExternalReferenceInterface
}

export interface ContactBlockResponse {
  values?: {
    nombreTitular?: string;
    telWA?: string;
  };
  blocks?: Array<{
    values?: {
      nombreTitular?: string;
      telWA?: string;
    };
  }>;
}
