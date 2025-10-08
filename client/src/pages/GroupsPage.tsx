import React, { useRef, useState } from 'react';
import { Button, Gapped, Hint, Input, Loader, Modal, Textarea, Toast } from '@skbkontur/react-ui';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ValidationContainer, ValidationWrapperV1, tooltip } from '@skbkontur/react-ui-validations';
import type { Group } from '../types/domain.ts';
import { GroupsAPI } from '../services/endpoints.ts';
import { useAsync } from '../hooks/useAsync.ts';
import { PageHeader, Section } from '../components/Layout.tsx';
import { BasicTheme } from '@skbkontur/react-ui/internal/themes/BasicTheme';

function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (g: Group) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const vcRef = useRef<ValidationContainer>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateName = (): any => (!name ? { message: 'Укажите название', type: 'submit' } : null);

  const submit = async () => {
    const ok = await vcRef.current?.validate();
    if (!ok) return;
    const g = await GroupsAPI.create({
      name,
      description: description || undefined,
      joinCode: joinCode || undefined,
    });
    Toast.push('Группа создана');
    onCreated(g);
    onClose();
    setName('');
    setDescription('');
    setJoinCode('');
  };

  if (!open) return null;
  return (
    <Modal onClose={onClose} width={500}>
      <Modal.Header>Создать группу</Modal.Header>
      <Modal.Body>
        <ValidationContainer ref={vcRef}>
          <Gapped gap={12} vertical>
            <ValidationWrapperV1 validationInfo={validateName()} renderMessage={tooltip('right')}>
              <Input
                placeholder="Название группы"
                value={name}
                onValueChange={setName}
                width={400}
              />
            </ValidationWrapperV1>
            <Textarea
              placeholder="Описание (необязательно)"
              value={description}
              onValueChange={setDescription}
              width={400}
            />
            <Hint text="Можете задать свой код приглашения или оставить пустым — сгенерируем автоматически.">
              <Input
                placeholder="Join code (опц.)"
                value={joinCode}
                onValueChange={setJoinCode}
                width={200}
              />
            </Hint>
          </Gapped>
        </ValidationContainer>
      </Modal.Body>
      <Modal.Footer>
        <Gapped>
          <Button use="primary" onClick={submit}>
            Создать
          </Button>
          <Button onClick={onClose}>Отмена</Button>
        </Gapped>
      </Modal.Footer>
    </Modal>
  );
}

export default function GroupsPage() {
  const { data: groups, loading, reload, setData } = useAsync(() => GroupsAPI.myGroups(), [], true);
  const [joinCode, setJoinCode] = useState('');
  const [modal, setModal] = useState(false);
  const vcRef = useRef<ValidationContainer>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateJoin = (): any => (!joinCode ? { message: 'Введите код', type: 'submit' } : null);

  const onJoin = async () => {
    const ok = await vcRef.current?.validate();
    if (!ok) return;
    const g = await GroupsAPI.join(joinCode.trim());
    Toast.push(`Вы вступили в группу «${g.name}»`);
    setJoinCode('');
    await reload();
  };

  const onCreated = (g: Group) => {
    setData([...(groups || []), g]);
  };

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 320,
        margin: '0 auto',
        background: BasicTheme.bgDefault,
        border: `1px solid ${BasicTheme.btnDefaultBorderColor}`,
        borderRadius: BasicTheme.modalBorderRadius,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <PageHeader title="Мои группы" />
      {loading ? (
        <Loader active caption="Загружаем группы" />
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 500 }}>Название</div>
            <div style={{ fontWeight: 500 }}>Код</div>
            {(groups || []).map((g) => (
              <React.Fragment key={g.id}>
                <div>
                  <div style={{ fontSize: 16 }}>
                    <RouterLink to={`/group/${g.id}`}>{g.name}</RouterLink>
                  </div>
                  <div style={{ color: '#888' }}>{g.description}</div>
                </div>

                <Hint text="скопировать?">
                  <div
                    onClick={() => {
                      navigator.clipboard.writeText(g.joinCode);
                      Toast.push('Код скопирован');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {g.joinCode}
                  </div>
                </Hint>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      <ValidationContainer ref={vcRef}>
        <p style={{ fontWeight: 500 }}>Вступить по коду</p>
        <Gapped>
          <ValidationWrapperV1
            validationInfo={validateJoin()}
            renderMessage={tooltip('right middle')}
          >
            <Input placeholder="JOIN-CODE" value={joinCode} onValueChange={setJoinCode} />
          </ValidationWrapperV1>
          <Button use="primary" onClick={onJoin}>
            Вступить
          </Button>
        </Gapped>
      </ValidationContainer>
      <p>
        Вы так же можете <a onClick={() => setModal(true)}>создать свою группу</a>
      </p>
      <CreateGroupModal open={modal} onClose={() => setModal(false)} onCreated={onCreated} />
    </div>
  );
}
