import { AppDataSource } from '../datasource';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { User } from '../entities/User';
import { generateJoinCode } from '../utils/joinCode';
import { GroupRole } from '../entities/enums';
import { SearchIndex } from './search/SearchIndex';
import { IntegrationRegistryService } from './IntegrationRegistryService';

export class GroupService {
  static async create(ownerId: string, name: string, description?: string, joinCode?: string) {
    const owner = await AppDataSource.getRepository(User).findOneByOrFail({ id: ownerId });
    const group = await AppDataSource.getRepository(Group).save({
      name,
      description: description || null,
      joinCode: joinCode || generateJoinCode(),
      owner,
    });
    await AppDataSource.getRepository(GroupMember).save({
      group,
      user: owner,
      role: GroupRole.OWNER,
    });
    SearchIndex.upsertMember(group.id, owner.id, owner.displayName || owner.username);
    await IntegrationRegistryService.seedBuiltins(group.id);
    return group;
  }

  static async myGroups(userId: string) {
    const gms = await AppDataSource.getRepository(GroupMember).find({
      where: { user: { id: userId } },
      relations: ['group'],
    });
    return gms.map((gm) => gm.group);
  }

  static async join(userId: string, joinCode: string) {
    const group = await AppDataSource.getRepository(Group).findOne({ where: { joinCode } });
    if (!group) throw new Error('GROUP_NOT_FOUND');
    const repoGM = AppDataSource.getRepository(GroupMember);
    const exists = await repoGM.findOne({
      where: { group: { id: group.id }, user: { id: userId } },
    });
    if (exists) return group;
    const user = await AppDataSource.getRepository(User).findOneByOrFail({ id: userId });
    await repoGM.save({ group, user, role: GroupRole.MEMBER });
    SearchIndex.upsertMember(group.id, user.id, user.displayName || user.username);
    return group;
  }

  static async members(userId: string, groupId: string) {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
    const members = await AppDataSource.getRepository(GroupMember).find({
      where: { group: { id: groupId } },
      relations: ['user'],
    });
    return members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));
  }

  static async changeBaseRole(
    ownerId: string,
    groupId: string,
    targetUserId: string,
    role: GroupRole,
  ) {
    // Только владелец может менять базовые роли (admin/member)
    const group = await AppDataSource.getRepository(Group).findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group || group.owner.id !== ownerId) throw new Error('FORBIDDEN');
    const repoGM = AppDataSource.getRepository(GroupMember);
    const gm = await repoGM.findOne({
      where: { group: { id: groupId }, user: { id: targetUserId } },
    });
    if (!gm) throw new Error('NOT_FOUND');
    // Нельзя понизить владельца
    if (gm.role === GroupRole.OWNER) throw new Error('CANNOT_CHANGE_OWNER');
    gm.role = role;
    await repoGM.save(gm);
  }

  static async removeMember(ownerId: string, groupId: string, targetUserId: string) {
    const group = await AppDataSource.getRepository(Group).findOne({
      where: { id: groupId },
      relations: ['owner'],
    });
    if (!group || group.owner.id !== ownerId) throw new Error('FORBIDDEN');
    const repoGM = AppDataSource.getRepository(GroupMember);
    const gm = await repoGM.findOne({
      where: { group: { id: groupId }, user: { id: targetUserId } },
    });
    if (!gm) throw new Error('NOT_FOUND');
    if (gm.role === GroupRole.OWNER) throw new Error('CANNOT_REMOVE_OWNER');
    await repoGM.delete(gm.id);
    SearchIndex.removeMember(groupId, targetUserId);
  }
}
