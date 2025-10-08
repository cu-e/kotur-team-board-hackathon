import React from 'react';
import { Button, Gapped, Loader, Select, Toast } from '@skbkontur/react-ui';
import { useParams } from 'react-router-dom';
import { GroupsAPI } from '../services/endpoints';
import type { RoleDef, UUID } from '../types/domain';

export default function GroupMembersPage() {
  const { groupId } = useParams();

  const [members, setMembers] = React.useState<GroupMember[] | null>(null);
  const [roles, setRoles] = React.useState<RoleDef[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [m, r] = await Promise.all([
        GroupsAPI.members(groupId as UUID),
        GroupsAPI.getRoles(groupId as UUID),
      ]);
      setMembers(m);
      setRoles(r);
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось загрузить участников/роли');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const changeBaseRole = async (userId: UUID, role: 'admin' | 'member') => {
    try {
      await GroupsAPI.setMemberBaseRole(groupId as UUID, userId, role);
      await load();
      Toast.push('Базовая роль обновлена');
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось изменить роль');
    }
  };

  const grantRole = async (userId: UUID, roleId: UUID) => {
    try {
      await GroupsAPI.grantRole(groupId as UUID, userId, roleId);
      await load();
      Toast.push('Роль выдана');
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось выдать роль');
    }
  };

  const revokeRole = async (userId: UUID, roleId: UUID) => {
    try {
      await GroupsAPI.revokeRole(groupId as UUID, userId, roleId);
      await load();
      Toast.push('Роль отозвана');
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось отозвать роль');
    }
  };

  const removeMember = async (userId: UUID) => {
    if (!window.confirm('Удалить участника из группы?')) return;
    try {
      await GroupsAPI.removeMember(groupId as UUID, userId);
      setMembers((prev) => (prev || []).filter((m) => m.id !== userId));
      Toast.push('Участник удалён');
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось удалить участника');
    }
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 200px 1fr 120px',
    columnGap: 12,
    rowGap: 8,
    alignItems: 'center',
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Участники группы</h2>

      {loading ? (
        <Loader active />
      ) : (
        <>
          {/* Header row */}
          <div
            style={{
              ...gridStyle,
              fontWeight: 600,
              borderBottom: '1px solid #eee',
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <div>Пользователь</div>
            <div>Базовая роль</div>
            <div>Кастомные роли</div>
            <div></div>
          </div>

          {/* Rows */}
          <div style={gridStyle}>
            {(members || []).map((m) => {
              const assigned = m.roles || [];
              const available = (roles || []).filter((r) => !assigned.some((ar) => ar.id === r.id));
              return (
                <React.Fragment key={m.id}>
                  {/* Пользователь */}
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.displayName || m.username}</div>
                    {m.username && m.displayName && (
                      <div style={{ color: '#888', fontSize: 12 }}>@{m.username}</div>
                    )}
                  </div>

                  {/* Базовая роль */}
                  <div>
                    {m.role === 'owner' ? (
                      <b>owner</b>
                    ) : (
                      <Select<string>
                        width={180}
                        items={['admin', 'member']}
                        value={m.role}
                        onValueChange={(v) => changeBaseRole(m.id, v as 'admin' | 'member')}
                        renderItem={(v) => v}
                        renderValue={(v) => (v ? (v as string) : '')}
                      />
                    )}
                  </div>

                  {/* Кастомные роли */}
                  <div>
                    <Gapped gap={6}>
                      {assigned.map((r) => (
                        <Button key={r.id} use="link" onClick={() => revokeRole(m.id, r.id)}>
                          {r.name} ✕
                        </Button>
                      ))}
                      <Select<RoleDef>
                        width={200}
                        placeholder="Выдать роль…"
                        items={available}
                        renderItem={(r) => r.name}
                        renderValue={(r) => (r ? (r as RoleDef).name : 'Выдать роль…')}
                        onValueChange={(r) => r && grantRole(m.id, (r as RoleDef).id)}
                      />
                    </Gapped>
                  </div>

                  {/* Действия */}
                  <div>
                    {m.role !== 'owner' && (
                      <Button use="danger" onClick={() => removeMember(m.id)}>
                        Удалить
                      </Button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            {!members?.length && (
              <div style={{ gridColumn: '1 / -1', color: '#888' }}>Пока нет участников</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
