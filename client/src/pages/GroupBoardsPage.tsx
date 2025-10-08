import { useState, useRef } from 'react';
import { Button, Gapped, Input, Loader, Modal, Textarea } from '@skbkontur/react-ui';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ValidationContainer, ValidationWrapperV1, tooltip } from '@skbkontur/react-ui-validations';
import { useAsync } from '../hooks/useAsync';
import { BoardsAPI, GroupsAPI } from '../services/endpoints';
import type { UUID } from '../types/domain';
import { PageHeader } from '../components/Layout';
import { BasicTheme } from '@skbkontur/react-ui/internal/themes/BasicTheme';
import { LottieBuilder } from '../components/LottieBuilder.tsx';
import { BoardCard } from '../components/board/BoardCard.tsx';

export default function GroupBoardsPage() {
  const { groupId } = useParams();

  const {
    data: boards,
    loading,
    setData,
  } = useAsync(() => GroupsAPI.boards(groupId as UUID), [groupId], true);

  const [modal, setModal] = useState(false);

  const createBoard = async (payload: { name: string; description?: string }) => {
    const b = await BoardsAPI.create(groupId as UUID, payload);
    setData([...(boards || []), b]);
    setModal(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        title="Доски группы"
        extra={
          <Button use="primary" onClick={() => setModal(true)}>
            Создать доску
          </Button>
        }
      />

      {loading ? (
        <Loader active caption="Загружаем доски" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Название</div>

          {boards?.length ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'clamp(8px, 2vw, 24px)',
              }}
            >
              {boards.map((b) => (
                <BoardCard
                  key={b.id}
                  board={b}
                  onOpen={(id) => window.location.assign(`/board/${id}`)}
                  onDelete={async (id) => {
                    await BoardsAPI.delete(id);
                  }}
                />
              ))}
            </div>
          ) : (
            <LottieBuilder
              name="Searching"
              width={520}
              title={{
                header: 'Досок не найдено!',
                description: <a onClick={() => setModal(true)}>Попробуйте создать новую!</a>,
              }}
            ></LottieBuilder>
          )}
        </div>
      )}

      <CreateBoardModal open={modal} onClose={() => setModal(false)} onCreate={createBoard} />
    </div>
  );
}

function CreateBoardModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (p: { name: string; description?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const vc = useRef<ValidationContainer>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validate = (): any => (!name ? { message: 'Название обязательно', type: 'submit' } : null);

  if (!open) return null;
  return (
    <Modal onClose={onClose} width={500}>
      <Modal.Header>Создать доску</Modal.Header>
      <Modal.Body>
        <ValidationContainer ref={vc}>
          <Gapped vertical gap={12}>
            <ValidationWrapperV1
              validationInfo={validate()}
              renderMessage={tooltip('right middle')}
            >
              <Input placeholder="Название" value={name} onValueChange={setName} width={400} />
            </ValidationWrapperV1>
            <Textarea
              placeholder="Описание (необязательно)"
              value={description}
              onValueChange={setDescription}
              width={400}
            />
          </Gapped>
        </ValidationContainer>
      </Modal.Body>
      <Modal.Footer>
        <Gapped>
          <Button
            use="primary"
            onClick={async () => {
              if (await vc.current?.validate()) {
                onCreate({ name, description: description || undefined });
                setName('');
                setDescription('');
              }
            }}
          >
            Создать
          </Button>
          <Button onClick={onClose}>Отмена</Button>
        </Gapped>
      </Modal.Footer>
    </Modal>
  );
}
