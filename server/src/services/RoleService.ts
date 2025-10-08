import { AppDataSource } from '../datasource';
import { RoleDef } from '../entities/RoleDef';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { GroupMemberRole } from '../entities/GroupMemberRole';
import { PermissionService } from './PermissionService';

export class RoleService {
  static async ensureMember(userId: string, groupId: string) {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
  }

  static async list(groupId: string, userId: string) {
    await this.ensureMember(userId, groupId);
    return AppDataSource.getRepository(RoleDef).find({
      where: { group: { id: groupId } },
      order: { name: 'ASC' },
    });
  }

  static async create(
    groupId: string,
    userId: string,
    payload: { name: string; manageTags?: boolean; manageMembers?: boolean; assignRoles?: boolean },
  ) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'assignRoles')))
      throw new Error('FORBIDDEN');
    const group = await AppDataSource.getRepository(Group).findOneByOrFail({ id: groupId });
    const role = AppDataSource.getRepository(RoleDef).create({
      group,
      name: payload.name.trim(),
      manageTags: !!payload.manageTags,
      manageMembers: !!payload.manageMembers,
      assignRoles: !!payload.assignRoles,
    });
    try {
      return await AppDataSource.getRepository(RoleDef).save(role);
    } catch (e: any) {
      if (String(e.message).includes('uq_group_role_name')) {
        const err = new Error('ROLE_EXISTS');
        (err as any).code = 'ROLE_EXISTS';
        throw err;
      }
      throw e;
    }
  }

  static async update(
    groupId: string,
    userId: string,
    roleId: string,
    patch: Partial<{
      name: string;
      manageTags: boolean;
      manageMembers: boolean;
      assignRoles: boolean;
    }>,
  ) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'assignRoles')))
      throw new Error('FORBIDDEN');
    const repo = AppDataSource.getRepository(RoleDef);
    const r = await repo.findOne({ where: { id: roleId }, relations: ['group'] });
    if (!r || r.group.id !== groupId) throw new Error('NOT_FOUND');
    if (patch.name !== undefined) r.name = patch.name.trim();
    if (patch.manageTags !== undefined) r.manageTags = !!patch.manageTags;
    if (patch.manageMembers !== undefined) r.manageMembers = !!patch.manageMembers;
    if (patch.assignRoles !== undefined) r.assignRoles = !!patch.assignRoles;
    return repo.save(r);
  }

  static async remove(groupId: string, userId: string, roleId: string) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'assignRoles')))
      throw new Error('FORBIDDEN');
    const repo = AppDataSource.getRepository(RoleDef);
    const r = await repo.findOne({ where: { id: roleId }, relations: ['group'] });
    if (!r || r.group.id !== groupId) throw new Error('NOT_FOUND');
    await repo.delete(roleId);
  }

  static async assignRole(groupId: string, actorId: string, userId: string, roleId: string) {
    if (!(await PermissionService.hasPermission(actorId, groupId, 'assignRoles')))
      throw new Error('FORBIDDEN');
    await this.ensureMember(userId, groupId);
    const repo = AppDataSource.getRepository(GroupMemberRole);
    const row = repo.create({
      group: { id: groupId } as any,
      user: { id: userId } as any,
      role: { id: roleId } as any,
    });
    try {
      return await repo.save(row);
    } catch {
      return row;
    }
  }

  static async revokeRole(groupId: string, actorId: string, userId: string, roleId: string) {
    if (!(await PermissionService.hasPermission(actorId, groupId, 'assignRoles')))
      throw new Error('FORBIDDEN');
    await AppDataSource.getRepository(GroupMemberRole).delete({
      group: { id: groupId } as any,
      user: { id: userId } as any,
      role: { id: roleId } as any,
    } as any);
  }
}
