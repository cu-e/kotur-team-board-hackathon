import { useMemo, useState } from 'react';
import { Button, Gapped, Loader, Toast } from '@skbkontur/react-ui';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { BoardsAPI, GroupsAPI, TasksAPI } from '../services/endpoints';
import { useAsync } from '../hooks/useAsync';
import { type Task, TaskStatus, type UUID } from '../types/domain';
import { PageHeader } from '../components/Layout';
import { TaskCard } from '../components/tasks/TaskCard';
import { MoveLeft, Plus } from 'lucide-react';
import CreateTaskModal from '../components/tasks/CreateTaskModal.tsx';
import EditTaskModal from '../components/tasks/EditTaskModal.tsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [openedModelCreateTask, setOpenedModelCreateTask] = useState(false);

  const { data: board, loading: loadingBoard } = useAsync(
    () => BoardsAPI.get(boardId as UUID),
    [boardId],
    true,
  );
  const {
    data: allTasks,
    loading,
    setData,
  } = useAsync(() => TasksAPI.list(boardId as UUID), [boardId], true);

  // цвета тегов группы
  const { data: groupTags } = useAsync(
    () => (board ? GroupsAPI.tags(board.group.id) : Promise.resolve([])),
    [board?.group.id],
    !!board,
  );
  const tagColors = useMemo<Record<string, string | undefined>>(() => {
    const map: Record<string, string | undefined> = {};
    (groupTags || []).forEach((t) => (map[t.name] = t.color || '#999999'));
    return map;
  }, [groupTags]);

  const tasksByStatus = useMemo(
    () => ({
      [TaskStatus.TODO]: (allTasks || []).filter((t) => t.status === TaskStatus.TODO),
      [TaskStatus.DOING]: (allTasks || []).filter((t) => t.status === TaskStatus.DOING),
      [TaskStatus.DONE]: (allTasks || []).filter((t) => t.status === TaskStatus.DONE),
    }),
    [allTasks],
  );

  // DnD
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('text/taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDropTo = async (e: React.DragEvent<HTMLDivElement>, to: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/taskId');
    if (!taskId) return;
    const t = (allTasks || []).find((x) => x.id === taskId);
    if (!t || t.status === to) return;
    try {
      await moveTask(taskId, to);
    } catch (err: any) {
      Toast.push(err?.message || 'Не удалось переместить задачу');
    }
  };
  const moveTask = async (taskId: string, to: TaskStatus) => {
    const updated = await TasksAPI.update(taskId, { status: to });
    setData((prev) => (prev || []).map((t) => (t.id === taskId ? { ...t, ...updated } : t)) as any);
  };

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    const updated = await TasksAPI.update(taskId, patch);
    setData((prev) => (prev || []).map((t) => (t.id === taskId ? { ...t, ...updated } : t)) as any);
  };

  const removeTask = async (taskId: string) => {
    await TasksAPI.remove(taskId);
    setData((prev) => (prev || []).filter((t) => t.id !== taskId) as any);
  };

  // редактирование
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const openEdit = (t: Task) => {
    setEditTask(t);
    setEditOpen(true);
  };
  const onUpdated = (t: Task) => {
    setData((prev) => (prev || []).map((x) => (x.id === t.id ? { ...x, ...t } : x)) as any);
    setEditOpen(false);
    setEditTask(null);
  };

  return (
    <div style={{ padding: 32 }}>
      {loadingBoard || !board ? (
        <Loader active caption="Загружаем доску" />
      ) : (
        <>
          <PageHeader
            title={`Доска: ${board.name}`}
            extra={
              <Gapped gap={16}>
                <RouterLink
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  to={`/group/${board.group.id}`}
                >
                  <Button size="medium" use="text" icon={<MoveLeft />}>
                    К доскам группы
                  </Button>
                </RouterLink>
                <Button
                  size="medium"
                  use="primary"
                  onClick={() => setOpenedModelCreateTask(true)}
                  icon={<Plus />}
                >
                  Создать задачу
                </Button>
              </Gapped>
            }
          />

          {/* Создание задачи */}
          <CreateTaskModal
            boardId={boardId as UUID}
            open={openedModelCreateTask}
            onClose={() => setOpenedModelCreateTask(false)}
            onCreated={(t) => {
              setData([...(allTasks || []), t]);
              setOpenedModelCreateTask(false);
            }}
          />

          {/* Канбан + DnD */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}
          >
            {/* TODO */}
            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(e, TaskStatus.TODO)}
              style={{ minHeight: 40 }}
            >
              <h4>Нужно сделать</h4>
              {tasksByStatus[TaskStatus.TODO].map((t) => (
                <div key={t.id} style={{ marginBottom: 8 }}>
                  <TaskCard
                    task={t}
                    onEdit={openEdit}
                    onDelete={() => removeTask(t.id)}
                    onDragStart={onDragStart}
                    tagColors={tagColors}
                  />
                </div>
              ))}
            </div>

            {/* DOING */}
            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(e, TaskStatus.DOING)}
              style={{ minHeight: 40 }}
            >
              <h4>В работе</h4>
              {tasksByStatus[TaskStatus.DOING].map((t) => (
                <div key={t.id} style={{ marginBottom: 8 }}>
                  <TaskCard
                    task={t}
                    onEdit={openEdit}
                    onDelete={() => removeTask(t.id)}
                    onDragStart={onDragStart}
                    tagColors={tagColors}
                  />
                </div>
              ))}
            </div>

            {/* DONE */}
            <div
              onDragOver={allowDrop}
              onDrop={(e) => onDropTo(e, TaskStatus.DONE)}
              style={{ minHeight: 40 }}
            >
              <h4>Выполнено</h4>
              {tasksByStatus[TaskStatus.DONE].map((t) => (
                <div key={t.id} style={{ marginBottom: 8 }}>
                  <TaskCard
                    task={t}
                    onEdit={openEdit}
                    onDelete={() => removeTask(t.id)}
                    onDragStart={onDragStart}
                    tagColors={tagColors}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Редактирование задачи */}
          <EditTaskModal
            boardId={board.id}
            task={editTask}
            open={editOpen}
            onClose={() => {
              setEditOpen(false);
              setEditTask(null);
            }}
            onUpdated={onUpdated}
          />
        </>
      )}

      {loading && (
        <div style={{ marginTop: 12 }}>
          <Loader active />
        </div>
      )}
    </div>
  );
}
