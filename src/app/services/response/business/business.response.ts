import { ExternalReferenceResponse } from "./external-reference.response";

export class BusinessResponse {
  businessId?: number;
  businessVersion?: number;
  versionNumber?: number;
  commercialName!: string;
  categoryCode!: string;
  townCode!: string;
  categoryName?: string | null;
  townName?: string | null;
  state!: string;
  lastUpdate?: string | Date;
  externalData!: string;
  externalReference?:ExternalReferenceResponse
}
