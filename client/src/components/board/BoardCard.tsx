import React from 'react';
import { Button, Gapped, Kebab, MenuItem } from '@skbkontur/react-ui';
import { Link as RouterLink } from 'react-router-dom';
import { BasicTheme } from '@skbkontur/react-ui/internal/themes/BasicTheme';

type Board = {
  id: string;
  name: string;
  description?: string | null;
};

interface BoardCardProps {
  board: Board;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const BoardCard: React.FC<BoardCardProps> = ({ board, onOpen, onDelete, className }) => {
  return (
    <div
      className={className}
      style={{
        background: BasicTheme.bgDefault,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: 240,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: BasicTheme.btnBorderRadiusLarge,
        minHeight: 80,
      }}
      role="button"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>
          <RouterLink to={`/board/${board.id}`} onClick={(e) => e.stopPropagation()}>
            {board.name}
          </RouterLink>
        </div>

        <Kebab>{onDelete && <MenuItem onClick={() => onDelete(board.id)}>Удалить</MenuItem>}</Kebab>
      </div>

      {board.description && (
        <p
          style={{
            margin: 0,
            color: '#888',
            wordBreak: 'break-word',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            lineHeight: '1.3',
            minHeight: 'calc(1em * 1.3 * 3)',
          }}
          title={board.description || undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {board.description}
        </p>
      )}

      {/* Низ: действия */}
      <div style={{ marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <Gapped>
          <Button onClick={() => onOpen(board.id)}>Открыть</Button>
        </Gapped>
      </div>
    </div>
  );
};
