export interface Business {
  businessId: string;
  versionNumber?: number;
  businessVersion?: number;
  commercialName: string;
  categoryName?: string | null;
  categoryCode?: string | null;
  townName?: string | null;
  townCode?: string | null;
  externalData?: string | null;
  formStatus: 'IN_PROGRESS' | 'PENDING' | 'COMPLETED' | string;
  lastUpdate: string | null;
}

export interface ClientData {
  advertiserId: string;
  advertiserName: string;
  businesses: Business[];
}
