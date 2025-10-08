import { AppDataSource } from '../datasource';
import { Board } from '../entities/Board';
import { Group } from '../entities/Group';
import { User } from '../entities/User';
import { GroupMember } from '../entities/GroupMember';
import { GroupRole } from '../entities/enums';

export class BoardService {
  static async create(groupId: string, creatorId: string, name: string, description?: string) {
    // проверка членства
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: creatorId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
    const group = await AppDataSource.getRepository(Group).findOneByOrFail({ id: groupId });
    const createdBy = await AppDataSource.getRepository(User).findOneByOrFail({ id: creatorId });
    return AppDataSource.getRepository(Board).save({
      name,
      description: description || null,
      group,
      createdBy,
    });
  }

  static async myBoards(userId: string) {
    const qb = AppDataSource.getRepository(Board)
      .createQueryBuilder('b')
      .innerJoin('b.group', 'g')
      .innerJoin(GroupMember, 'gm', 'gm.groupId = g.id AND gm.userId = :userId', { userId })
      .leftJoinAndSelect('b.group', 'g2')
      .orderBy('b.created_at', 'DESC');
    return qb.getMany();
  }

  static async listByGroup(userId: string, groupId: string) {
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
    return AppDataSource.getRepository(Board).find({
      where: { group: { id: groupId } },
      order: { createdAt: 'DESC' },
    });
  }

  static async get(boardId: string, userId: string) {
    const board = await AppDataSource.getRepository(Board).findOne({
      where: { id: boardId },
      relations: ['group'],
    });
    if (!board) throw new Error('NOT_FOUND');
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: board.group.id }, user: { id: userId } },
    });
    if (!gm) throw new Error('FORBIDDEN');
    return board;
  }

  static async remove(boardId: string, userId: string) {
    const repo = AppDataSource.getRepository(Board);
    const b = await repo.findOne({ where: { id: boardId }, relations: ['group'] });
    if (!b) throw new Error('NOT_FOUND');
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: b.group.id }, user: { id: userId } },
    });
    if (!gm || (gm.role !== GroupRole.OWNER && gm.role !== GroupRole.ADMIN))
      throw new Error('FORBIDDEN');
    await repo.delete(boardId);
  }
}
