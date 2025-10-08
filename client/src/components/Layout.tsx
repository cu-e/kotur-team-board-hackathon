import React, { useEffect, useState } from 'react';
import { Gapped, Kebab, MenuItem } from '@skbkontur/react-ui';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext.tsx';

async function getGravatarHash(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export function AppHeader() {
  const auth = useAuth();
  const nav = useNavigate();
  const goGroups = () => nav('/');
  const [avatarHash, setAvatarHash] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user?.username) {
      getGravatarHash(auth.user.username + '@gmail.com').then(setAvatarHash);
    }
  }, [auth.user]);

  return (
    <div
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid #eee',
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
      }}
    >
      <div>
        <RouterLink to="/">
          <b>Kontur.TeamBoard</b>
        </RouterLink>
      </div>
      <div>
        {auth.user ? (
          <Gapped gap={18} verticalAlign={'middle'}>
            <div
              style={{
                backgroundImage: `url(https://0.gravatar.com/avatar/${avatarHash})`,

                width: 32,
                height: 32,
                backgroundRepeat: 'no-repeat',
                backgroundClip: 'border-box',
                backgroundSize: 'cover',
                borderRadius: '100%',
              }}
            />
            <Gapped gap={4}>
              <span style={{ color: '#666' }}>{auth.user.displayName || auth.user.username}</span>
              <Kebab>
                <MenuItem onClick={goGroups}>Мои группы</MenuItem>
                <MenuItem
                  onClick={() => {
                    auth.logout();
                    nav('/login');
                  }}
                >
                  Выйти
                </MenuItem>
              </Kebab>
            </Gapped>
          </Gapped>
        ) : (
          <RouterLink to="/login">Войти</RouterLink>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: 0 }}>{title}</h2>
      <div>{extra}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}
