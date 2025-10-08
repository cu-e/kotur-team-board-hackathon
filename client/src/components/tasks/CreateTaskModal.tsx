import React from 'react';
import { DatePicker, Gapped, Input, Modal, TokenInput, Toast, Loader } from '@skbkontur/react-ui';

import { BoardsAPI, GroupsAPI, TasksAPI } from '../../services/endpoints.ts';
import type { GroupMember, GroupTag, Task, UUID } from '../../types/domain.ts';
import { parseDatePickerToISO } from '../../utils/date.ts';
import IssueEditor from '../../utils/TextEditor.tsx';

type Props = {
  boardId: UUID;
  open: boolean;
  onClose: () => void;
  onCreated: (t: Task) => void;
};

export default function CreateTaskModal({ boardId, open, onClose, onCreated }: Props) {
  const [titleExternal, setTitleExternal] = React.useState('');
  const [due, setDue] = React.useState<string | null>(null);

  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedAssignee, setSelectedAssignee] = React.useState<string[]>([]);

  const [_groupId, setGroupId] = React.useState<UUID | null>(null);
  const [tags, setTags] = React.useState<GroupTag[] | null>(null);
  const [members, setMembers] = React.useState<GroupMember[] | null>(null);
  const [_loadingMeta, setLoadingMeta] = React.useState(false);

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
      } catch (e: any) {
        Toast.push(e?.message || 'Не удалось загрузить данные группы');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const getTagItems = React.useCallback(
    (q: string) => {
      const list = (tags || []).map((t) => t.name);
      const ql = (q || '').toLowerCase();
      const filtered = list.filter(
        (name) => name.toLowerCase().includes(ql) || name.toLowerCase() === ql,
      );
      return Promise.resolve(filtered);
    },
    [tags],
  );

  const memberLabel = (m: GroupMember) => m.displayName?.trim() || m.username;
  const getMemberItems = React.useCallback(
    (q: string) => {
      const list = (members || []).map(memberLabel);
      const ql = (q || '').toLowerCase();
      const filtered = list.filter(
        (name) => name.toLowerCase().includes(ql) || name.toLowerCase() === ql,
      );
      return Promise.resolve(filtered);
    },
    [members],
  );

  const reset = () => {
    setTitleExternal('');
    setDue(null);
    setSelectedTags([]);
    setSelectedAssignee([]);
    // оставляем загруженные tags/members — они кэшируются на время жизни компонента
  };

  // submit из IssueEditor → создаём задачу
  const handleEditorSubmit = async (payload: {
    title: string;
    contentJSON: string;
    contentText: string;
  }) => {
    const finalTitle = (payload.title || titleExternal || '').trim();
    if (!finalTitle) {
      Toast.push('Укажите заголовок (в редакторе или в поле выше)');
      return;
    }
    try {
      const created = await TasksAPI.create(boardId, {
        title: finalTitle,
        description: payload.contentJSON || null,
        due_at: parseDatePickerToISO(due),
        assignee: selectedAssignee[0] || null,
        labels: selectedTags,
      } as Partial<Task> & { title: string });

      onCreated(created);
      Toast.push('Задача создана');
      reset();
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
      <Modal.Header>Создание задачи</Modal.Header>
      <Modal.Body>
        {/* 2) ПОКА МЕТА НЕТ — только Loader, без "пустых" полей: */}
        {!isMetaReady ? (
          <div style={{ padding: 12 }}>
            <Loader active caption="Загружаем участников и теги..." />
          </div>
        ) : (
          <Gapped vertical gap={12}>
            <div>
              <p style={{ fontWeight: 500, margin: '4px 0' }}>Заголовок (опц.)</p>
              <Input
                placeholder="Можно оставить пустым — возьмём из IssueEditor"
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
              <IssueEditor defaultTitle="" onSubmit={handleEditorSubmit} />
            </div>
          </Gapped>
        )}
      </Modal.Body>
    </Modal>
  ) : null;
}
