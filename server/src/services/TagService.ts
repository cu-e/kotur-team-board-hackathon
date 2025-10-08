import { AppDataSource } from '../datasource';
import { Group } from '../entities/Group';
import { GroupMember } from '../entities/GroupMember';
import { GroupTag } from '../entities/GroupTag';
import { PermissionService } from './PermissionService';
import { SearchIndex } from './search/SearchIndex';

export class TagService {
  static async ensureMember(userId: string, groupId: string) {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
  }

  static async list(groupId: string, userId: string) {
    await this.ensureMember(userId, groupId);
    return AppDataSource.getRepository(GroupTag).find({
      where: { group: { id: groupId } },
      order: { name: 'ASC' },
    });
  }

  static async create(groupId: string, userId: string, name: string, color?: string | null) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'manageTags')))
      throw new Error('FORBIDDEN');
    const group = await AppDataSource.getRepository(Group).findOneByOrFail({ id: groupId });
    const repo = AppDataSource.getRepository(GroupTag);
    const tag = repo.create({ group, name: name.trim(), color: color || null });
    try {
      const saved = await repo.save(tag);
      // обновляем быстрый индекс
      SearchIndex.upsertTag(groupId, saved.id, saved.name);
      return saved;
    } catch (e: any) {
      if (String(e.message).includes('uq_group_tag_name')) {
        const err = new Error('TAG_EXISTS');
        (err as any).code = 'TAG_EXISTS';
        throw err;
      }
      throw e;
    }
  }

  static async update(
    groupId: string,
    userId: string,
    tagId: string,
    patch: { name?: string; color?: string | null },
  ) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'manageTags')))
      throw new Error('FORBIDDEN');
    const repo = AppDataSource.getRepository(GroupTag);
    const t = await repo.findOne({ where: { id: tagId }, relations: ['group'] });
    if (!t || t.group.id !== groupId) throw new Error('NOT_FOUND');
    if (patch.name !== undefined) t.name = patch.name.trim();
    if (patch.color !== undefined) t.color = patch.color;
    const saved = await repo.save(t);
    SearchIndex.upsertTag(groupId, saved.id, saved.name);
    return saved;
  }

  static async remove(groupId: string, userId: string, tagId: string) {
    if (!(await PermissionService.hasPermission(userId, groupId, 'manageTags')))
      throw new Error('FORBIDDEN');
    const repo = AppDataSource.getRepository(GroupTag);
    const t = await repo.findOne({ where: { id: tagId }, relations: ['group'] });
    if (!t || t.group.id !== groupId) throw new Error('NOT_FOUND');
    await repo.delete(tagId);
    SearchIndex.removeTag(groupId, tagId);
  }
}
