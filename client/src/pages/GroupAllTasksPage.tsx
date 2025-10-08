import React from 'react';
import { Gapped, Input, Loader, TokenInput } from '@skbkontur/react-ui';
import { useParams } from 'react-router-dom';
import { GroupsAPI } from '../services/endpoints';
import type { Task, UUID } from '../types/domain';
import { TasksAPI } from '../services/endpoints';
import { TaskCard } from '../components/tasks/TaskCard.tsx';
import { LottieBuilder } from '../components/LottieBuilder.tsx';

export default function GroupAllTasksPage() {
  const { groupId } = useParams();
  const [loading, setLoading] = React.useState(false);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [q, setQ] = React.useState('');
  const [selTags, setSelTags] = React.useState<string[]>([]);
  const [selUsers, setSelUsers] = React.useState<string[]>([]);

  const [allTagNames, setAllTagNames] = React.useState<string[]>([]);
  const [allUserNames, setAllUserNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [tags, members, boards] = await Promise.all([
          GroupsAPI.tags(groupId as UUID),
          GroupsAPI.members(groupId as UUID),
          GroupsAPI.boards(groupId as UUID),
        ]);
        if (cancelled) return;
        setAllTagNames(tags.map((t) => t.name));
        setAllUserNames(members.map((m) => m.displayName || m.username));

        // задачи со всех досок группы
        const all = await Promise.all(boards.map((b) => TasksAPI.list(b.id)));
        setTasks(all.flat());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // источники для TokenInput
  const getTagItems = (query: string) => {
    const ql = (query || '').toLowerCase();
    return Promise.resolve(
      allTagNames.filter((n) => n.toLowerCase().includes(ql) || n.toLowerCase() === ql),
    );
  };
  const getUserItems = (query: string) => {
    const ql = (query || '').toLowerCase();
    return Promise.resolve(
      allUserNames.filter((n) => n.toLowerCase().includes(ql) || n.toLowerCase() === ql),
    );
  };

  const filtered = tasks.filter((t) => {
    if (q && !`${t.title} ${t.description || ''}`.toLowerCase().includes(q.toLowerCase())) {
      return false;
    }
    if (selTags.length) {
      const taskLabels = t.labels || [];
      if (!selTags.every((x) => taskLabels.includes(x))) return false;
    }
    if (selUsers.length) {
      const assignee = t.assignee || '';
      if (!selUsers.some((u) => u === assignee)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: 24 }}>
      <h2>Все задачи группы</h2>
      <Gapped vertical gap={12}>
        <Gapped gap={8}>
          <Input
            placeholder="Поиск по названию/описанию"
            value={q}
            onValueChange={setQ}
            width={340}
          />
          <TokenInput
            placeholder="Фильтр по тегам"
            getItems={getTagItems}
            selectedItems={selTags}
            onValueChange={setSelTags}
            width={300}
            size="small"
          />
          <TokenInput
            placeholder="Фильтр по исполнителям"
            getItems={getUserItems}
            selectedItems={selUsers}
            onValueChange={setSelUsers}
            width={300}
            size="small"
          />
        </Gapped>

        {loading ? (
          <Loader active caption="Загружаем задачи…" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {filtered.map((t) => (
              <TaskCard
                task={t}
                onDelete={() => {}}
                onEdit={() => {}}
                onDragStart={() => {}}
                draggableDisabled
              ></TaskCard>
            ))}
            {!filtered.length && (
              <>
                <div></div>
                <LottieBuilder
                  name="Searching"
                  width={520}
                  title={{
                    header: 'Тегов не найдено!',
                  }}
                ></LottieBuilder>
              </>
            )}
          </div>
        )}
      </Gapped>
    </div>
  );
}
