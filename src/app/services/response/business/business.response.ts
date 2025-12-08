
export class BusinessResponse {
  businessId?: number;
  BusinessVersion?: number;
  commercialName!: string;
  categoryCode!: string;
  townCode!: string;
  state!: string;
  lastUpdate?: string | Date;
  ExternalData!: string;
}
