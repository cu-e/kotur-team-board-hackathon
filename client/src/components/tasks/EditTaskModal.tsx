import React from 'react';
import { DatePicker, Gapped, Input, Loader, Modal, TokenInput, Toast } from '@skbkontur/react-ui';

import { BoardsAPI, GroupsAPI, TasksAPI } from '../../services/endpoints.ts';
import type { GroupMember, GroupTag, Task, UUID } from '../../types/domain.ts';
import { parseDatePickerToISO, formatISOToDatePicker } from '../../utils/date.ts';
import IssueEditor from '../../utils/TextEditor.tsx';

type Props = {
  boardId: UUID;
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (t: Task) => void;
};

export default function EditTaskModal({ boardId, task, open, onClose, onUpdated }: Props) {
  const [titleExternal, setTitleExternal] = React.useState(task?.title ?? '');
  const [due, setDue] = React.useState<string | null>(formatISOToDatePicker(task?.due_at ?? null));

  // Теги (имена)
  const [selectedTags, setSelectedTags] = React.useState<string[]>(task?.labels ?? []);
  const [selectedAssignee, setSelectedAssignee] = React.useState<string[]>(
    task?.assignee ? [task.assignee] : [],
  );

  // ---- board -> group -> tags + members ----
  const [_groupId, setGroupId] = React.useState<UUID | null>(null);
  const [tags, setTags] = React.useState<GroupTag[] | null>(null);
  const [members, setMembers] = React.useState<GroupMember[] | null>(null);
  const [_loadingMeta, setLoadingMeta] = React.useState(false);

  // Мапы для конвертации исполнителя между label и username
  const [labelToUsername, setLabelToUsername] = React.useState<Record<string, string>>({});
  const [usernameToLabel, setUsernameToLabel] = React.useState<Record<string, string>>({});

  const memberLabel = React.useCallback(
    (m: GroupMember) => (m.displayName?.trim() ? m.displayName.trim() : m.username),
    [],
  );

  // ✅ PRE-FETCH: грузим метаданные заранее (по boardId), а не по open — убирает мерцание
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingMeta(true);
        const board = await BoardsAPI.get(boardId);
        if (cancelled) return;

        const gid = board.group.id as UUID;
        setGroupId(gid);

        const [tg, mem] = await Promise.all([GroupsAPI.tags(gid), GroupsAPI.members(gid)]);
        if (cancelled) return;

        setTags(tg);
        setMembers(mem);

        // Построить мапы для исполнителя
        const l2u: Record<string, string> = {};
        const u2l: Record<string, string> = {};
        for (const m of mem) {
          const lbl = memberLabel(m);
          l2u[lbl] = m.username;
          u2l[m.username] = lbl;
        }
        setLabelToUsername(l2u);
        setUsernameToLabel(u2l);
      } catch (e: any) {
        Toast.push(e?.message || 'Не удалось загрузить данные группы');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, memberLabel]);

  // ✅ Пересинхронизация при смене задачи (инициализируем форму и label исполнителя)
  React.useEffect(() => {
    setTitleExternal(task?.title ?? '');
    setDue(formatISOToDatePicker(task?.due_at ?? null));
    setSelectedTags(task?.labels ?? []);

    if (task?.assignee) {
      const label = usernameToLabel[task.assignee] ?? task.assignee;
      setSelectedAssignee([label]);
    } else {
      setSelectedAssignee([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, usernameToLabel]);

  // ---- источники для TokenInput ----
  const getTagItems = React.useCallback(
    (q: string) => {
      const list = (tags ?? []).map((t) => t.name);
      const ql = (q ?? '').toLowerCase();
      return Promise.resolve(list.filter((name) => name.toLowerCase().includes(ql)));
    },
    [tags],
  );

  const getMemberItems = React.useCallback(
    (q: string) => {
      const list = (members ?? []).map(memberLabel);
      const ql = (q ?? '').toLowerCase();
      return Promise.resolve(list.filter((name) => name.toLowerCase().includes(ql)));
    },
    [members, memberLabel],
  );

  const reset = () => {
    setTitleExternal(task?.title ?? '');
    setDue(formatISOToDatePicker(task?.due_at ?? null));
    setSelectedTags(task?.labels ?? []);
    if (task?.assignee) {
      const label = usernameToLabel[task.assignee] ?? task.assignee;
      setSelectedAssignee([label]);
    } else {
      setSelectedAssignee([]);
    }
  };

  const handleEditorSubmit = async (payload: {
    title: string;
    contentJSON: string;
    contentText: string;
  }) => {
    if (!task) return;

    const finalTitle = (payload.title || titleExternal || '').trim();
    if (!finalTitle) {
      Toast.push('Укажите заголовок (в редакторе или в поле выше)');
      return;
    }

    // 🔑 конверсия выбранного label -> канонический username
    const chosenLabel = selectedAssignee[0]?.trim();
    const assigneeUsername = chosenLabel ? (labelToUsername[chosenLabel] ?? null) : null;

    try {
      const updated = await TasksAPI.update(task.id, {
        title: finalTitle,
        description: payload.contentJSON || null,
        due_at: parseDatePickerToISO(due),
        assignee: assigneeUsername,
        labels: selectedTags,
      });

      onUpdated(updated);
      Toast.push('Изменения сохранены');
      onClose();
    } catch (e: any) {
      const msg = String(e?.message || e);
      try {
        const body = JSON.parse(msg);
        if (body?.error === 'UNKNOWN_TAGS' && Array.isArray(body.tags)) {
          Toast.push(`Неизвестные теги: ${body.tags.join(', ')}`);
          return;
        }
      } catch {}
      Toast.push(msg);
    }
  };

  const isMetaReady = Boolean(tags && members);

  return open ? (
    <Modal
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <Modal.Header>Редактирование задачи</Modal.Header>
      <Modal.Body>
        {/* фиксируем минимальную высоту, чтобы визуально не прыгало при загрузке */}
        <div style={{ minHeight: 420 }}>
          {!isMetaReady ? (
            <div style={{ padding: 12 }}>
              <Loader active caption="Загружаем участников и теги..." />
            </div>
          ) : (
            <Gapped vertical gap={12}>
              <div>
                <p style={{ fontWeight: 500, margin: '4px 0' }}>Заголовок</p>
                <Input
                  placeholder="Можно оставить пустым — возьмём из редактора"
                  value={titleExternal}
                  onValueChange={setTitleExternal}
                  width={420}
                />
              </div>

              <div>
                <p style={{ fontWeight: 500, margin: '4px 0' }}>Теги</p>
                <TokenInput
                  size="small"
                  getItems={getTagItems}
                  selectedItems={selectedTags}
                  onValueChange={setSelectedTags}
                  placeholder={
                    tags?.length ? 'Начните вводить имя тега…' : 'В этой группе пока нет тегов'
                  }
                  disabled={!tags?.length}
                  width={420}
                />
              </div>

              <div>
                <p style={{ fontWeight: 500, margin: '4px 0' }}>Исполнитель</p>
                <TokenInput
                  placeholder="Выберите исполнителя (1)"
                  size="small"
                  getItems={getMemberItems}
                  selectedItems={selectedAssignee}
                  onValueChange={(next) => setSelectedAssignee(next.slice(0, 1))}
                  width={420}
                  disabled={!members?.length}
                />
              </div>

              <div>
                <p style={{ fontWeight: 500, margin: '4px 0' }}>Срок</p>
                <DatePicker value={due} onValueChange={setDue} />
              </div>

              <div>
                <p style={{ fontWeight: 500, margin: '4px 0' }}>Описание</p>
                {/* ключ — чтобы корректно подменять дефолтные значения при смене задачи */}
                <IssueEditor
                  key={task?.id ?? 'new'}
                  defaultTitle={task?.title ?? ''}
                  defaultContent={task?.description ?? ''}
                  onSubmit={handleEditorSubmit}
                />
              </div>
            </Gapped>
          )}
        </div>
      </Modal.Body>
    </Modal>
  ) : null;
}
