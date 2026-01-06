import { BusinessFormBlock } from '../models/form-schema.model';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';

export class PayloadBuilder {
  private blocks: { code: string; values: Record<string, unknown> }[] = [];

  constructor(
    private readonly actorType: string,
    private readonly actorId: string
  ) {}

  withBlocks(blocks: BusinessFormBlock[]): this {
    this.blocks = blocks.map((block) => ({
      code: block.code,
      values: block.values ?? {}
    }));
    return this;
  }

  build(): SaveBlocksRequest {
    return {
      actorType: this.actorType,
      actorId: this.actorId,
      blocks: this.blocks
    };
  }
}
