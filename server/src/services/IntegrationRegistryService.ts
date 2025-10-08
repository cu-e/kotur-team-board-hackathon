import { AppDataSource } from '../datasource';
import { Integration, BuiltinType } from '../entities/Integration';
import { Group } from '../entities/Group';
import { Board } from '../entities/Board';
import { generatePublicKey } from '../utils/keys';
import { GroupMember } from '../entities/GroupMember';
import { GroupRole } from '../entities/enums';

const BUILTIN_PRESETS: Record<Exclude<BuiltinType, null>, { name: string; color: string }> = {
  diadoc: { name: 'Контур.Диадок', color: 'FF8A00' },
  extern: { name: 'Контур.Экстерн', color: '0B7A3B' },
  tolk: { name: 'Контур.Толк', color: '2B6CB0' },
};

export class IntegrationRegistryService {
  static async ensureMember(userId: string, groupId: string) {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
    return gm;
  }
  static async ensureAdminOrOwner(userId: string, groupId: string) {
    const gm = await this.ensureMember(userId, groupId);
    if (gm.role !== GroupRole.OWNER && gm.role !== GroupRole.ADMIN) throw new Error('FORBIDDEN');
  }

  static async seedBuiltins(groupId: string) {
    const repo = AppDataSource.getRepository(Integration);
    const group = { id: groupId } as Group;
    for (const type of ['diadoc', 'extern', 'tolk'] as BuiltinType[]) {
      const exists = await repo.findOne({
        where: { group: { id: groupId }, builtinType: type as BuiltinType },
      });
      if (exists) continue;
      const preset = BUILTIN_PRESETS[type as Exclude<BuiltinType, null>];
      await repo.save({
        group,
        targetBoard: null,
        name: preset.name,
        color: preset.color,
        trustedDomain: null,
        key: generatePublicKey(24),
        isBuiltin: true,
        builtinType: type as BuiltinType,
        active: true,
      });
    }
  }

  static async list(groupId: string, userId: string) {
    await this.ensureMember(userId, groupId);
    return AppDataSource.getRepository(Integration).find({
      where: { group: { id: groupId } },
      relations: ['targetBoard'],
    });
  }

  static async create(
    groupId: string,
    userId: string,
    payload: {
      name: string;
      color?: string | null;
      trustedDomain?: string | null;
      board_id?: string | null;
    },
  ) {
    await this.ensureAdminOrOwner(userId, groupId);
    const group = await AppDataSource.getRepository(Group).findOneByOrFail({ id: groupId });
    const board = payload.board_id
      ? await AppDataSource.getRepository(Board).findOneByOrFail({ id: payload.board_id })
      : null;
    if (board && (board as any).groupId && (board as any).groupId !== groupId)
      throw new Error('BOARD_NOT_IN_GROUP');
    const integ = AppDataSource.getRepository(Integration).create({
      group,
      targetBoard: board || null,
      name: payload.name.trim(),
      color: payload.color || null,
      trustedDomain: payload.trustedDomain || null,
      key: generatePublicKey(24),
      isBuiltin: false,
      builtinType: null,
      active: true,
    });
    return AppDataSource.getRepository(Integration).save(integ);
  }

  static async update(
    groupId: string,
    userId: string,
    id: string,
    patch: {
      name?: string;
      color?: string | null;
      trustedDomain?: string | null;
      board_id?: string | null;
      active?: boolean;
    },
  ) {
    await this.ensureAdminOrOwner(userId, groupId);
    const repo = AppDataSource.getRepository(Integration);
    const integ = await repo.findOne({ where: { id }, relations: ['group', 'targetBoard'] });
    if (!integ || integ.group.id !== groupId) throw new Error('NOT_FOUND');
    if (integ.isBuiltin) {
      // builtin нельзя переименовывать/удалять, но можно цвет, домен, целевую доску, active
      if (patch.name) delete patch.name;
    }
    if (patch.color !== undefined) integ.color = patch.color;
    if (patch.trustedDomain !== undefined) integ.trustedDomain = patch.trustedDomain;
    if (patch.active !== undefined) integ.active = !!patch.active;
    if (patch.board_id !== undefined) {
      integ.targetBoard = patch.board_id
        ? await AppDataSource.getRepository(Board).findOneByOrFail({ id: patch.board_id })
        : null;
    }
    if (patch.name !== undefined) integ.name = patch.name!.trim();
    return repo.save(integ);
  }

  static async remove(groupId: string, userId: string, id: string) {
    await this.ensureAdminOrOwner(userId, groupId);
    const repo = AppDataSource.getRepository(Integration);
    const integ = await repo.findOne({ where: { id }, relations: ['group'] });
    if (!integ || integ.group.id !== groupId) throw new Error('NOT_FOUND');
    if (integ.isBuiltin) throw new Error('CANNOT_DELETE_BUILTIN');
    await repo.delete(id);
  }

  static async rotateKey(groupId: string, userId: string, id: string) {
    await this.ensureAdminOrOwner(userId, groupId);
    const repo = AppDataSource.getRepository(Integration);
    const integ = await repo.findOne({ where: { id }, relations: ['group'] });
    if (!integ || integ.group.id !== groupId) throw new Error('NOT_FOUND');
    integ.key = generatePublicKey(24);
    return repo.save(integ);
  }

  static async byKey(key: string) {
    return AppDataSource.getRepository(Integration).findOne({
      where: { key },
      relations: ['group', 'targetBoard'],
    });
  }
}
