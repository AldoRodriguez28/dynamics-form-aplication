export class SaveBlocksRequest {
  actorType?: string;
  actorId?: string;
  blocks?: any;
  finalizeTask?: boolean;
  [key: string]: unknown;
}
