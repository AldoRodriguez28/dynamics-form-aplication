import { BusinessFormBlock } from '../../models/form-schema.model';

export class BlockAccessPolicy {
  constructor(
    private readonly readOnly: boolean,
    private readonly canEdit?: boolean | null,
    private readonly userRole?: string | null
  ) {}

  isBlockReadOnly(block: BusinessFormBlock): boolean {
    if (this.readOnly) return true;
    if (this.canEdit === false) return true;
    const roles = block.readOnlyRoles ?? [];
    if (!roles.length || !this.userRole) return false;
    return roles.includes(this.userRole);
  }

  isBlockVisible(block: BusinessFormBlock): boolean {
    const visibility = block.visibility;
    if (!visibility || Object.keys(visibility).length === 0) return true;
    if (!this.userRole) return true;
    return visibility[this.userRole] !== false;
  }
}
