import { ExternalReferenceInterface } from "./external-reference.interface";

export interface BusinessInterface {
  businessId?: number | null;
  businessVersion?: number | null;
  commercialName?: string | null;
  categoryCode?: string | null;
  townCode?: string | null;
  state?: string | null;
  lastUpdate?: string | Date | null;
  externalData?: string | null;
  externalReference?:ExternalReferenceInterface
}