import React from 'react';
import { Kebab, Link, MenuItem } from '@skbkontur/react-ui';
import { formatISOToDatePicker } from '../../utils/date';
import type { Task } from '../../types/domain';

export function TaskCard({
  task,
  onDelete,
  onEdit,
  onDragStart,
  tagColors,
  draggableDisabled = false,
}: {
  task: Task;
  onDelete: () => void | Promise<void>;
  onEdit: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  tagColors?: Record<string, string | undefined>;
  draggableDisabled?: boolean;
}) {
  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => {
        if (!draggableDisabled) {
          onDragStart(e, task);
        } else {
          e.preventDefault();
        }
      }}
      style={{ cursor: draggableDisabled ? 'default' : 'grab' }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600 }}>{task.title}</div>
          <Kebab>
            <MenuItem onClick={() => onEdit(task)}>Редактировать</MenuItem>
            <MenuItem onClick={onDelete}>Удалить</MenuItem>
          </Kebab>
        </div>

        <div style={{ color: '#666', fontSize: 12 }}>
          {task.assignee ? (
            <>
              Исполнитель: <b>{task.assignee}</b>&nbsp;·&nbsp;
            </>
          ) : null}
          {task.due_at ? (
            <>
              Срок: <b>{formatISOToDatePicker(task.due_at)}</b>&nbsp;·&nbsp;
            </>
          ) : null}
          Источник: <b>{task.source}</b>
          {task.source_link ? (
            <>
              &nbsp;—{' '}
              <Link href={task.source_link} target="_blank">
                открыть
              </Link>
            </>
          ) : null}
        </div>

        {/* Теги задачи */}
        {task.labels?.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {task.labels.map((name) => {
              const color = tagColors?.[name] || '#999999';
              return (
                <span
                  key={name}
                  title={name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #e5e5e5',
                    background: '#fff',
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: color,
                      border: '1px solid #ddd',
                    }}
                  />
                  <span>{name}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
