import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Gapped } from '@skbkontur/react-ui';
import { BookCopy, GalleryVerticalEnd, Tags, UsersRound, Waypoints } from 'lucide-react';
import { BasicTheme } from '@skbkontur/react-ui/internal/themes/BasicTheme';

export default function GroupLayout() {
  const { groupId } = useParams();

  const linkStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 6,
    textDecoration: 'none',
    color: '#333',
  };

  const linkConnect: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 6,
    textDecoration: 'none',
    background: BasicTheme.brand,
    color: '#fff',
  };

  const activeConnect: React.CSSProperties = {
    background: '#eef3ff',
    color: '#611fe5',
    fontWeight: 600,
  };

  const activeStyle: React.CSSProperties = {
    background: '#eef3ff',
    color: '#1f66e5',
    fontWeight: 600,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: 16,
        padding: 16,
        maxWidth: 1300,
        margin: '0 auto',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          borderRight: '1px solid #eee',
          paddingRight: 12,
          minHeight: 'calc(100vh - 80px)',
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>Навигация по группе</div>
        <Gapped vertical gap={6}>
          <NavLink
            to={`/group/${groupId}`}
            end
            style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
          >
            <BookCopy size={20} />
            Доски
          </NavLink>
          <NavLink
            to={`/group/${groupId}/members`}
            style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
          >
            <UsersRound size={20} />
            Участники и роли
          </NavLink>
          <NavLink
            to={`/group/${groupId}/tags`}
            style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
          >
            <Tags size={20} />
            Теги
          </NavLink>
          <NavLink
            to={`/group/${groupId}/tasks`}
            style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
          >
            <GalleryVerticalEnd size={20} />
            Все задачи
          </NavLink>

          <NavLink
            to={`/group/${groupId}/integration`}
            style={({ isActive }) =>
              isActive ? { ...linkConnect, ...activeConnect } : linkConnect
            }
          >
            <Waypoints size={20} />
            Интеграции
          </NavLink>
        </Gapped>
      </aside>

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
