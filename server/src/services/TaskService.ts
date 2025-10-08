import { AppDataSource } from '../datasource';
import { Task } from '../entities/Task';
import { Board } from '../entities/Board';
import { TaskStatus, TaskSource } from '../entities/enums';
import { parseDateISO } from '../utils/date';
import { GroupMember } from '../entities/GroupMember';
import { GroupTag } from '../entities/GroupTag';
import { User } from '../entities/User';

export class TaskService {
  static async list(
    boardId: string,
    filters?: { status?: TaskStatus; dueBefore?: string; label?: string; source?: TaskSource },
  ) {
    const qb = AppDataSource.getRepository(Task)
      .createQueryBuilder('t')
      .where('t.boardId = :boardId', { boardId })
      .orderBy('t.created_at', 'DESC');

    if (filters?.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters?.source) qb.andWhere('t.source = :source', { source: filters.source });
    if (filters?.dueBefore)
      qb.andWhere('t.due_at IS NOT NULL AND t.due_at <= :due', { due: filters.dueBefore });
    if (filters?.label)
      qb.andWhere("json_extract(t.labels, '$') LIKE :lbl", { lbl: `%${filters.label}%` });

    return qb.getMany();
  }

  private static async validateAssignee(groupId: string, assigneeUserId?: string | null) {
    if (!assigneeUserId) return { user: null as User | null };
    const gm = await AppDataSource.getRepository(GroupMember).findOne({
      where: { group: { id: groupId }, user: { id: assigneeUserId } },
      relations: ['user'],
    });
    if (!gm) throw new Error('ASSIGNEE_NOT_MEMBER');
    return { user: gm.user };
  }

  private static async validateLabels(groupId: string, labels?: string[] | null) {
    if (!labels || labels.length === 0) return;
    const tags = await AppDataSource.getRepository(GroupTag).find({
      where: { group: { id: groupId } },
    });
    const allow = new Set(tags.map((t) => t.name));
    const bad = labels.filter((l) => !allow.has(l));
    if (bad.length) {
      const err = new Error('UNKNOWN_TAGS');
      (err as any).tags = bad;
      throw err;
    }
  }

  static async create(
    boardId: string,
    payload: Partial<Task> & { title: string; assignee_user_id?: string | null },
  ) {
    const board = await AppDataSource.getRepository(Board).findOne({
      where: { id: boardId },
      relations: ['group'],
    });
    if (!board) throw new Error('BOARD_NOT_FOUND');

    const { user: assigneeUser } = await this.validateAssignee(
      board.group.id,
      (payload as any).assignee_user_id,
    );
    await this.validateLabels(board.group.id, payload.labels || null);

    const toSave = AppDataSource.getRepository(Task).create({
      board,
      title: payload.title,
      description: payload.description || null,
      status: payload.status || TaskStatus.TODO,
      assignee: assigneeUser
        ? assigneeUser.displayName || assigneeUser.username
        : payload.assignee || null,
      assigneeUser: assigneeUser || null,
      dueAt: parseDateISO((payload as any).due_at) || null,
      source: payload.source || TaskSource.MANUAL,
      sourceLink: (payload as any).source_link || null,
      labels: payload.labels || null,
    });
    return AppDataSource.getRepository(Task).save(toSave);
  }

  static async update(taskId: string, patch: Partial<Task> & { assignee_user_id?: string | null }) {
    const repo = AppDataSource.getRepository(Task);
    const t = await repo.findOne({ where: { id: taskId }, relations: ['board', 'board.group'] });
    if (!t) throw new Error('NOT_FOUND');

    if ((patch as any).assignee_user_id !== undefined) {
      const { user } = await this.validateAssignee(
        t.board.group.id,
        (patch as any).assignee_user_id,
      );
      t.assigneeUser = user || null;
      t.assignee = user ? user.displayName || user.username : (patch.assignee ?? null);
    }
    if (patch.labels !== undefined) {
      await this.validateLabels(t.board.group.id, patch.labels || null);
      t.labels = (patch.labels as any) || null;
    }

    if (patch.title !== undefined) t.title = patch.title as string;
    if (patch.description !== undefined) t.description = (patch.description as any) || null;
    if (patch.status !== undefined) t.status = patch.status as TaskStatus;
    if ((patch as any).due_at !== undefined) t.dueAt = parseDateISO((patch as any).due_at);
    if ((patch as any).source_link !== undefined) t.sourceLink = (patch as any).source_link || null;

    return repo.save(t);
  }

  static async remove(taskId: string) {
    await AppDataSource.getRepository(Task).delete(taskId);
  }
}

export default TaskService; // опционально: если используешь default-импорт
