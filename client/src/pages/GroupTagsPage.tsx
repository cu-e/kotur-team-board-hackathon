import React from 'react';
import { Button, Gapped, Input, Loader, Toast } from '@skbkontur/react-ui';
import { useParams } from 'react-router-dom';
import { GroupsAPI } from '../services/endpoints';
import type { GroupTag, UUID } from '../types/domain';
import { LottieBuilder } from '../components/LottieBuilder.tsx';

export default function GroupTagsPage() {
  const { groupId } = useParams();
  const [tags, setTags] = React.useState<GroupTag[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  // форма создания
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState('#888888');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await GroupsAPI.tags(groupId as UUID);
      setTags(list);
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось загрузить теги');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      Toast.push('Введите имя тега');
      return;
    }
    try {
      const t = await GroupsAPI.createTag(groupId as UUID, { name: name.trim(), color });
      setTags([...(tags || []), t]);
      setName('');
      Toast.push('Тег создан');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('409')) Toast.push('Имя тега уже занято');
      else Toast.push(msg);
    }
  };

  const update = async (tagId: UUID, patch: Partial<GroupTag>) => {
    try {
      const t = await GroupsAPI.updateTag(groupId as UUID, tagId, patch);
      setTags((prev) => (prev || []).map((x) => (x.id === tagId ? t : x)));
      Toast.push('Сохранено');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('409')) Toast.push('Имя тега уже занято');
      else Toast.push(msg);
    }
  };

  const remove = async (tagId: UUID) => {
    if (!window.confirm('Удалить тег?')) return;
    try {
      await GroupsAPI.deleteTag(groupId as UUID, tagId);
      setTags((prev) => (prev || []).filter((x) => x.id !== tagId));
      Toast.push('Тег удалён');
    } catch (e: any) {
      Toast.push(e?.message || 'Не удалось удалить тег');
    }
  };

  const gridRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 160px',
    columnGap: 12,
    alignItems: 'center',
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Теги группы</h2>

      {/* Создание */}
      <div style={{ ...gridRow, marginBottom: 16 }}>
        <Input
          type="color"
          width={80}
          value={color}
          onValueChange={(v) => setColor(v || '#888888')}
        />
        <Input placeholder="Имя тега" value={name} onValueChange={setName} width={260} />
        <Button onClick={create}>Создать</Button>
      </div>

      {loading ? (
        <Loader active />
      ) : (
        <>
          {/* Заголовки */}
          <div
            style={{
              ...gridRow,
              fontWeight: 600,
              borderBottom: '1px solid #eee',
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <div>Цвет</div>
            <div>Имя</div>
            <div></div>
          </div>

          {/* Список тегов */}
          <div style={{ display: 'grid', rowGap: 8 }}>
            {(tags || []).map((t) => (
              <TagRow
                key={t.id}
                tag={t}
                onSave={(patch) => update(t.id, patch)}
                onDelete={() => remove(t.id)}
              />
            ))}
            {!tags?.length && (
              <LottieBuilder
                name="Searching"
                width={520}
                title={{
                  header: 'Тегов не найдено!',
                }}
              ></LottieBuilder>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TagRow({
  tag,
  onSave,
  onDelete,
}: {
  tag: GroupTag;
  onSave: (patch: Partial<GroupTag>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [name, setName] = React.useState(tag.name);
  const [color, setColor] = React.useState(tag.color || '#999999');
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setName(tag.name);
    setColor(tag.color || '#999999');
    setDirty(false);
  }, [tag.id, tag.name, tag.color]);

  const apply = async () => {
    if (!dirty) return;
    await onSave({ name, color });
    setDirty(false);
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 160px',
    columnGap: 12,
    alignItems: 'center',
  };

  return (
    <div style={rowStyle}>
      <Input
        type="color"
        width={80}
        value={color}
        onValueChange={(v) => {
          setColor(v || '#999999');
          setDirty(true);
        }}
      />
      <Input
        value={name}
        onValueChange={(v) => {
          setName(v);
          setDirty(true);
        }}
      />
      <Gapped gap={8}>
        <Button disabled={!dirty} onClick={apply}>
          Сохранить
        </Button>
        <Button use="danger" onClick={onDelete}>
          Удалить
        </Button>
      </Gapped>
    </div>
  );
}
