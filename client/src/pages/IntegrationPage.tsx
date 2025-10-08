// pages/IntegrationsTab.tsx
import React from 'react';
import {
  Button,
  Gapped,
  Input,
  Kebab,
  MenuItem,
  Modal,
  Select,
  Checkbox,
  Hint,
  Toast,
} from '@skbkontur/react-ui';
import { useParams } from 'react-router-dom';
import type {
  Board,
  Integration,
  IntegrationCreate,
  IntegrationPatch,
  UUID,
} from '../types/domain.ts';
import { GroupsAPI, IntegrationsAPI } from '../services/endpoints.ts';

type Props = { groupId?: UUID };

const COLORS = ['FF8A00', '0B7A3B', '2B6CB0', '22C55E', 'A855F7', 'F2994A', 'EB5757'];
const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';

const colorSwatch = (hexNoHash: string, active?: boolean): React.CSSProperties => ({
  width: 22,
  height: 22,
  borderRadius: 6,
  background: `#${hexNoHash}`,
  border: active ? '2px solid #000' : '2px solid rgba(0,0,0,0.12)',
  cursor: 'pointer',
});
const hookUrl = (key: string) => `${origin}/hooks/${key}`;

export default function IntegrationsTab(props: Props) {
  // 1) Надёжно получаем groupId: пропсы -> роутер
  const params = useParams<{ groupId?: string }>();
  const groupId = (props.groupId ?? (params.groupId as UUID | undefined)) as UUID | undefined;

  const [loading, setLoading] = React.useState(true);
  const [integrations, setIntegrations] = React.useState<Integration[]>([]);
  const [boards, setBoards] = React.useState<Board[]>([]);

  // создание
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState(COLORS[0]);
  const [newDomain, setNewDomain] = React.useState('');
  const [newBoardId, setNewBoardId] = React.useState<UUID | null>(null);

  // модалки по паттерну {opened && renderModal()}
  const [helpOpened, setHelpOpened] = React.useState(false);
  const [editOpened, setEditOpened] = React.useState(false);

  // редактирование
  const [editing, setEditing] = React.useState<Integration | null>(null);
  const [patchName, setPatchName] = React.useState('');
  const [patchColor, setPatchColor] = React.useState(COLORS[0]);
  const [patchDomain, setPatchDomain] = React.useState<string | null>(null);
  const [patchBoardId, setPatchBoardId] = React.useState<UUID | null>(null);
  const [patchActive, setPatchActive] = React.useState(true);

  const load = async (gid: UUID) => {
    try {
      setLoading(true);
      const [ints, bds] = await Promise.all([IntegrationsAPI.list(gid), GroupsAPI.boards(gid)]);
      setIntegrations(ints);
      setBoards(bds);
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось загрузить интеграции');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    load(groupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const submitCreate = async () => {
    if (!groupId) {
      Toast.push('Не удалось определить группу');
      return;
    }
    if (!newName.trim() || !newBoardId) {
      Toast.push('Укажите название и целевую доску');
      return;
    }
    const payload: IntegrationCreate = {
      name: newName.trim(),
      color: newColor,
      trustedDomain: newDomain.trim() ? newDomain.trim() : undefined,
      board_id: newBoardId,
    };
    try {
      const created = await IntegrationsAPI.create(groupId, payload);
      setIntegrations((prev) => [created, ...prev]);
      setNewName('');
      setNewColor(COLORS[0]);
      setNewDomain('');
      setNewBoardId(null);
      Toast.push('Интеграция создана');
    } catch (e: any) {
      const msg = String(e?.message || e);
      try {
        const body = JSON.parse(msg);
        if (body?.error === 'NAME_EXISTS') {
          Toast.push('Имя уже занято в этой группе');
          return;
        }
      } catch {}
      Toast.push(msg);
    }
  };

  const openEdit = (i: Integration) => {
    setEditing(i);
    setPatchName(i.name);
    setPatchColor(i.color);
    setPatchDomain(i.trustedDomain);
    setPatchBoardId(i.targetBoard?.id ?? null);
    setPatchActive(i.active);
    setEditOpened(true);
  };

  const submitPatch = async () => {
    if (!groupId || !editing) {
      Toast.push('Не удалось определить группу');
      return;
    }
    const patch: IntegrationPatch = {
      name: editing.isBuiltin ? undefined : patchName,
      color: patchColor,
      trustedDomain: patchDomain,
      board_id: patchBoardId ?? undefined,
      active: patchActive,
    };
    try {
      const updated = await IntegrationsAPI.update(groupId, editing.id, patch);
      setIntegrations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditOpened(false);
      setEditing(null);
      Toast.push('Изменения сохранены');
    } catch (e: any) {
      Toast.push(String(e?.message || e));
    }
  };

  const remove = async (i: Integration) => {
    if (!groupId) {
      Toast.push('Не удалось определить группу');
      return;
    }
    if (i.isBuiltin) {
      Toast.push('Встроенные интеграции нельзя удалять');
      return;
    }
    if (!confirm(`Удалить интеграцию «${i.name}»?`)) return;
    try {
      await IntegrationsAPI.remove(groupId, i.id);
      setIntegrations((prev) => prev.filter((x) => x.id !== i.id));
      Toast.push('Интеграция удалена');
    } catch (e: any) {
      Toast.push(String(e?.message || e));
    }
  };

  const rotate = async (i: Integration) => {
    if (!groupId) {
      Toast.push('Не удалось определить группу');
      return;
    }
    try {
      const res = await IntegrationsAPI.rotateKey(groupId, i.id);
      setIntegrations((prev) => prev.map((x) => (x.id === i.id ? { ...x, key: res.key } : x)));
      try {
        await navigator.clipboard.writeText(hookUrl(res.key));
        Toast.push('Ключ обновлён. Новый URL скопирован в буфер.');
      } catch {
        Toast.push('Ключ обновлён. Скопируйте новый URL вручную.');
      }
    } catch (e: any) {
      Toast.push(String(e?.message || e));
    }
  };

  function renderHelpModal() {
    function close() {
      setHelpOpened(false);
    }
    return (
      <Modal onClose={close}>
        <Modal.Header>Публичный вебхук задач</Modal.Header>
        <Modal.Body>
          <Gapped vertical gap={8}>
            <div style={{ color: '#666' }}>
              POST на <code>/hooks/&lt;key&gt;</code> с JSON. Если задан trustedDomain — присылайте
              <code> X-Webhook-Domain</code>.
            </div>
            <div>
              Пример:
              <pre
                style={{
                  background: '#F7F7F7',
                  padding: 10,
                  borderRadius: 6,
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >{`POST ${origin}/hooks/<KEY>
Content-Type: application/json
X-Webhook-Domain: partner.example.com

{
  "title": "Оплатить счёт #42",
  "description": "Срок до пятницы",
  "assignee_user_id": "uuid-or-null",
  "due_at": "2025-10-10T12:00:00.000Z",
  "labels": ["срочно"],
  "source_link": "https://partner.example.com/invoice/42"
}`}</pre>
            </div>
          </Gapped>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={close}>Закрыть</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  function renderEditModal() {
    if (!editing) return null;
    function close() {
      setEditOpened(false);
      setEditing(null);
    }
    return (
      <Modal onClose={close}>
        <Modal.Header>Редактирование интеграции</Modal.Header>
        <Modal.Body>
          <Gapped vertical gap={10}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Название</div>
              <Input
                disabled={editing.isBuiltin}
                value={patchName}
                onValueChange={setPatchName}
                width={420}
              />
              {editing.isBuiltin && (
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  Имя встроенных интеграций менять нельзя
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Цвет</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((c) => (
                  <div
                    key={c}
                    style={colorSwatch(c, c === patchColor)}
                    onClick={() => setPatchColor(c)}
                    title={`#${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Доверенный домен</div>
              <Input
                value={patchDomain ?? ''}
                onValueChange={(v) => setPatchDomain(v || null)}
                width={420}
                placeholder="оставьте пустым, чтобы снять ограничение"
              />
            </div>

            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Целевая доска</div>
              <Select
                placeholder="Выберите доску"
                value={patchBoardId ?? null}
                onValueChange={(v: UUID) => setPatchBoardId(v)}
                width={420}
              >
                {boards.map((b) => (
                  <Select.Item key={b.id} value={b.id}>
                    {b.name}
                  </Select.Item>
                ))}
              </Select>
            </div>

            <Checkbox checked={patchActive} onValueChange={setPatchActive}>
              Активна
            </Checkbox>
          </Gapped>
        </Modal.Body>
        <Modal.Footer>
          <Gapped>
            <Button use="primary" onClick={submitPatch}>
              Сохранить
            </Button>
            <Button onClick={close}>Отмена</Button>
          </Gapped>
        </Modal.Footer>
      </Modal>
    );
  }

  const renderCard = (i: Integration) => {
    const url = hookUrl(i.key);
    return (
      <div
        key={i.id}
        style={{
          border: '1px solid #eee',
          borderRadius: 8,
          background: '#fff',
          padding: 16,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          width: 560,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: `#${i.color}`,
            marginTop: 6,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontWeight: 600 }}>
              {i.name}{' '}
              {i.isBuiltin && (
                <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}>(встроенная)</span>
              )}
              {!i.active && (
                <span style={{ marginLeft: 8, color: '#B00020', fontSize: 12 }}>отключена</span>
              )}
            </div>
            <Kebab>
              <MenuItem onClick={() => navigator.clipboard.writeText(url)}>
                Скопировать URL
              </MenuItem>
              <MenuItem onClick={() => rotate(i)}>Ротировать ключ</MenuItem>
              <MenuItem onClick={() => openEdit(i)}>Изменить</MenuItem>
              {!i.isBuiltin && <MenuItem onClick={() => remove(i)}>Удалить</MenuItem>}
              <MenuItem
                onClick={() =>
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      {
                        id: i.id,
                        name: i.name,
                        color: i.color,
                        trustedDomain: i.trustedDomain,
                        key: i.key,
                        targetBoard: i.targetBoard,
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                Экспорт настроек
              </MenuItem>
            </Kebab>
          </div>

          <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
            Доверенный домен: <b>{i.trustedDomain ?? 'не задан'}</b>
          </div>
          <div style={{ color: '#666', fontSize: 12 }}>
            Целевая доска:{' '}
            <b>
              {i.targetBoard ? i.targetBoard.name : 'не назначена (вебхук вернёт NO_TARGET_BOARD)'}
            </b>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Публичный вебхук</div>
            <div
              style={{
                background: '#F7F7F7',
                padding: '8px 10px',
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              <span>{url}</span>
              <Button size="small" onClick={() => navigator.clipboard.writeText(url)}>
                Копировать
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // === render ===
  function openHelp() {
    setHelpOpened(true);
  }

  return (
    <div style={{ padding: 24 }}>
      {/* модалки по образцу */}
      {helpOpened && renderHelpModal()}
      {editOpened && renderEditModal()}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 20 }}>Интеграции группы</div>
          <div style={{ color: '#666' }}>
            Принимайте вебхуки, настраивайте ключи и назначайте целевые доски.
          </div>
        </div>
        <Button onClick={openHelp}>Как работает вебхук задач?</Button>
      </div>

      {!groupId ? (
        <div style={{ marginTop: 16, color: '#B00020' }}>
          Не удалось определить <b>groupId</b>. Проверь роут (ожидается
          /groups/:groupId/integrations) или передай проп{' '}
          <code>{'<IntegrationsTab groupId="..."/>'}</code>.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {loading ? <div>Загрузка…</div> : integrations.map(renderCard)}
          </div>

          {/* создание кастомной интеграции */}
          <div
            style={{
              marginTop: 24,
              border: '1px dashed #ddd',
              borderRadius: 10,
              padding: 16,
              background: '#FCFCFD',
              width: 560,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Создать интеграцию</div>
            <Gapped vertical gap={10}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Название</div>
                <Input value={newName} onValueChange={setNewName} width={420} />
              </div>

              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Цвет</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map((c) => (
                    <div
                      key={c}
                      style={colorSwatch(c, c === newColor)}
                      onClick={() => setNewColor(c)}
                      title={`#${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Доверенный домен (опционально)</div>
                <Input
                  value={newDomain}
                  onValueChange={setNewDomain}
                  width={420}
                  placeholder="partner.example.com"
                />
              </div>

              <div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Целевая доска</div>
                <Select
                  placeholder="Выберите доску"
                  value={newBoardId ?? null}
                  onValueChange={(v: UUID) => setNewBoardId(v)}
                  width={420}
                >
                  {boards.map((b) => (
                    <Select.Item key={b.id} value={b.id}>
                      {b.name}
                    </Select.Item>
                  ))}
                </Select>
              </div>

              <Button use="primary" onClick={submitCreate}>
                Создать
              </Button>
            </Gapped>
          </div>
        </>
      )}
    </div>
  );
}
