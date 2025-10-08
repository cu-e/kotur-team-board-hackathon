import { TaskService } from './TaskService';
import { AppDataSource } from '../datasource';
import { MeetingNote } from '../entities/MeetingNote';
import { TaskSource } from '../entities/enums';

export class IntegrationService {
  static async createTaskFromDiadoc(payload: {
    board_id: string;
    document_title: string;
    document_url: string;
    counterparty?: string;
    due_at?: string | null;
    assignee?: string | null;
  }) {
    return TaskService.create(payload.board_id, {
      title: payload.document_title,
      description: payload.counterparty ? `Контрагент: ${payload.counterparty}` : null,
      assignee: payload.assignee || null,
      source: TaskSource.DIADOC,
      source_link: payload.document_url,
      due_at: payload.due_at || null,
    } as any);
  }

  static async importFromTolk(payload: {
    board_id: string;
    meeting_title: string;
    transcript: string;
  }) {
    // сохраняем сырой конспект
    const mn = await AppDataSource.getRepository(MeetingNote).save({
      board: { id: payload.board_id } as any,
      title: payload.meeting_title,
      rawTranscript: payload.transcript,
      parsedAt: new Date(),
    });
    // очень простые эвристики: строки → задачи, ищем имя и датки вида DD.MM
    const lines = payload.transcript
      .split(/\n|\r/)
      .map((s) => s.trim())
      .filter(Boolean);
    const created: any[] = [];
    for (const ln of lines) {
      // пример: "Иван: собрать метрики до 08.10"
      const m = ln.match(/^(?<who>[А-ЯЁA-Z][а-яёa-zA-Z._-]+)\s*[:—-]\s*(?<what>.+)$/u);
      const who = m?.groups?.who || null;
      let what = (m?.groups?.what || ln).trim();
      let due: string | null = null;
      const d = what.match(/\b(\d{1,2})[.](\d{1,2})(?:[.](\d{2,4}))?\b/);
      if (d) {
        const dd = d[1].padStart(2, '0');
        const mm = d[2].padStart(2, '0');
        const yyyy = d[3]
          ? d[3].length === 2
            ? `20${d[3]}`
            : d[3]
          : String(new Date().getFullYear());
        due = `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
        what = what.replace(d[0], '').trim();
      }
      if (what.length < 3) continue;
      const t = await TaskService.create(payload.board_id, {
        title: what,
        assignee: who,
        source: TaskSource.TOLK,
        due_at: due,
      } as any);
      // привяжем к MeetingNote
      await AppDataSource.getRepository(MeetingNote)
        .createQueryBuilder()
        .relation(MeetingNote, 'tasks')
        .of(mn)
        .add(t as any);
      created.push(t);
    }
    return { created };
  }
}
