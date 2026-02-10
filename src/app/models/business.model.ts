export interface Business {
  businessId: string;
  versionNumber?: number;
  businessVersion?: number;
  commercialName: string;
  formStatus: 'IN_PROGRESS' | 'PENDING' | 'COMPLETED' | string;
  lastUpdate: string | null;
}

export interface ClientData {
  advertiserId: string;
  advertiserName: string;
  businesses: Business[];
}
