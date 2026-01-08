import { ExternalReferenceResponse } from "./external-reference.response";

export class BusinessResponse {
  businessId?: number;
  businessVersion?: number;
  commercialName!: string;
  categoryCode!: string;
  townCode!: string;
  state!: string;
  lastUpdate?: string | Date;
  externalData!: string;
  externalReference?:ExternalReferenceResponse
}
