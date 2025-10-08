import React from 'react';
import { Button, Gapped, Input, Toast } from '@skbkontur/react-ui';
import { ValidationContainer, ValidationWrapperV1, tooltip } from '@skbkontur/react-ui-validations';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext.tsx';

export default function LoginPage() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const auth = useAuth();
  const nav = useNavigate();
  // @ts-ignore
  const from = (history.state && history.state.usr && history.state.usr.from) || '/';
  const vc = React.useRef<ValidationContainer>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vUser = (): any => (!username ? { message: 'Введите логин', type: 'submit' } : null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vPass = (): any => (!password ? { message: 'Введите пароль', type: 'submit' } : null);

  const submit = async () => {
    const ok = await vc.current?.validate();
    if (!ok) return;
    setLoading(true);
    try {
      await auth.login(username.trim(), password);
      Toast.push('Вход выполнен');
      nav(from || '/', { replace: true });
    } catch (e: any) {
      Toast.push(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <h2 style={{ textAlign: 'center' }}>Вход в TeamBoard</h2>
      <ValidationContainer ref={vc}>
        <Gapped vertical gap={12}>
          <ValidationWrapperV1 validationInfo={vUser()} renderMessage={tooltip('right')}>
            <Input placeholder="Логин" value={username} onValueChange={setUsername} width={360} />
          </ValidationWrapperV1>
          <ValidationWrapperV1 validationInfo={vPass()} renderMessage={tooltip('right')}>
            <Input
              placeholder="Пароль"
              value={password}
              onValueChange={setPassword}
              width={360}
              type="password"
            />
          </ValidationWrapperV1>
          <Button use="primary" loading={loading} onClick={submit} width={360}>
            Войти
          </Button>
        </Gapped>
      </ValidationContainer>
    </div>
  );
}
