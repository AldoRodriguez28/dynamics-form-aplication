import { BusinessInterface } from "../../Interfaces/business/response/business.interface";
import { LegacyBusinessInterface } from "../../Interfaces/business/response/legacy-business.interface";
import { BusinessForm } from "../../models/form-schema.model";
import { BusinessDetailWithBlocksResponse } from "../../services/response/business/Business-detail-withBlocks.response";
import { BusinessResponse } from "../../services/response/business/business.response";
import { LegacyBusinessResponse } from "../../services/response/business/legacy-business.response";

export class BusinessMapping {

  /**
   * Mapea BusinessResponse (clase) → BusinessInterface (interface)
   */
  static MapBusinessResponseToInterface = (response: BusinessResponse): BusinessInterface => ({
    businessId: response.businessId ?? null,
    businessVersion: response.businessVersion ?? null,
    commercialName: response.commercialName ?? null,
    categoryCode: response.categoryCode ?? null,
    townCode: response.townCode ?? null,
    state: response.state ?? null,
    lastUpdate: response.lastUpdate ?? null,
    externalData: response.externalData ?? null,
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

  static MapBlocksToBusinessForm(res: BusinessDetailWithBlocksResponse, commercialName:string ): BusinessForm {
  const business = (res as any).business ?? res;
  const blocks = (res as any).blocks ?? business.blocks ?? [];

  return {
    businessId: business.businessId,
    businessVersion: business.businessVersion ?? null,
    versionNumber: business.versionNumber ?? business.businessVersion ?? null,
    advertiserId: business.advertiserId,
    commercialName: business.commercialName ?? commercialName,
    status: business.state ?? (res as any).state ?? null,

    blocks: blocks
  } as BusinessForm;
}


}
