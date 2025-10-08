import { AppDataSource } from '../datasource';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { GroupMemberRole } from '../entities/GroupMemberRole';
import { RoleDef } from '../entities/RoleDef';
import { GroupRole } from '../entities/enums';

export type PermissionKey = 'manageTags' | 'manageMembers' | 'assignRoles';

export class PermissionService {
  static async isOwner(userId: string, groupId: string) {
    const g = await AppDataSource.getRepository(Group).findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    return g?.owner?.id === userId;
  }
  static async baseRole(userId: string, groupId: string): Promise<GroupRole | null> {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });
    return gm?.role ?? null;
  }
  static async hasPermission(
    userId: string,
    groupId: string,
    perm: PermissionKey,
  ): Promise<boolean> {
    if (await this.isOwner(userId, groupId)) return true;
    const base = await this.baseRole(userId, groupId);

    if (base === GroupRole.ADMIN) {
      if (perm === 'manageTags' || perm === 'assignRoles') return true;
      if (perm === 'manageMembers') return true;
    }

    const rows = await AppDataSource.getRepository(GroupMemberRole).find({
      where: { group: { id: groupId }, user: { id: userId } },
      relations: ['role'],
    });
    const agg = rows.reduce<Record<PermissionKey, boolean>>(
      (acc, r) => ({
        manageTags: acc.manageTags || r.role.manageTags,
        manageMembers: acc.manageMembers || r.role.manageMembers,
        assignRoles: acc.assignRoles || r.role.assignRoles,
      }),
      { manageTags: false, manageMembers: false, assignRoles: false },
    );
    return !!agg[perm];
  }
}
