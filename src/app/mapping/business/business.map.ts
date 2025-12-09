import { BusinessInterface } from "../../Interfaces/business/response/business.interface";
import { LegacyBusinessInterface } from "../../Interfaces/business/response/legacy-business.interface";
import { BusinessResponse } from "../../services/response/business/business.response";
import { LegacyBusinessResponse } from "../../services/response/business/legacy-business.response";

export class BusinessMapping {

  /**
   * Mapea BusinessResponse (clase) → BusinessInterface (interface)
   */
  static MapBusinessResponseToInterface = (response: BusinessResponse): BusinessInterface => ({
    businessId: response.businessId ?? null,
    BusinessVersion: response.BusinessVersion ?? null,
    commercialName: response.commercialName ?? null,
    categoryCode: response.categoryCode ?? null,
    townCode: response.townCode ?? null,
    state: response.state ?? null,
    lastUpdate: response.lastUpdate ?? null,
    ExternalData: response.ExternalData ?? null,
  });

  /**
   * Mapea LegacyBusinessResponse (clase) → LegacyBusinessInterface (interface)
   */
  static MapLegacyResponseToLegacyInterface = (
    response: LegacyBusinessResponse
  ): LegacyBusinessInterface => ({
    legacyAdvertiserId: response.legacyAdvertiserId ?? null,
    businesses: Array.isArray(response.businesses)
      ? response.businesses.map(b => this.MapBusinessResponseToInterface(b))
      : null
  });

}
