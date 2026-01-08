import { Block } from "./blocks-response";

export class BusinessDetailWithBlocksResponse {
    businessId?: number;
    commercialName?: string;
    accountId?: string;
    legacyAdvertiserId?: number;
    categoryCode?: string;
    businessCreatedAt?: Date;
    businessCreatedBy?: string;
    //version
    versionNumber?: number;
    scope?: string;
    state?: string;
    versionCreatedAt?: Date;
    versionCreatedBy?: string;
    blocks!: Block[];
}
