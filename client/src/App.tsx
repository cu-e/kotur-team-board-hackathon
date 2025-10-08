import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext.tsx';
import { AppHeader } from './components/Layout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import { RequireAuth } from './app/RequireAuth.tsx';
import GroupsPage from './pages/GroupsPage.tsx';
import GroupBoardsPage from './pages/GroupBoardsPage.tsx';
import BoardPage from './pages/BoardPage.tsx';
import GroupLayout from './app/GroupLayout.tsx';
import GroupMembersPage from './pages/GroupMembersPage.tsx';
import GroupTagsPage from './pages/GroupTagsPage.tsx';
import GroupAllTasksPage from './pages/GroupAllTasksPage.tsx';
import IntegrationsTab from './pages/IntegrationPage.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ margin: '0 auto' }}>
          <AppHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <GroupsPage />
                </RequireAuth>
              }
            />

            <Route
              path="/group/:groupId"
              element={
                <RequireAuth>
                  <GroupLayout />
                </RequireAuth>
              }
            >
              <Route index element={<GroupBoardsPage />} />
              <Route path="members" element={<GroupMembersPage />} />
              <Route path="tags" element={<GroupTagsPage />} />
              <Route path="tasks" element={<GroupAllTasksPage />} />
              <Route path="integration" element={<IntegrationsTab />} />
            </Route>

            {/* без боковой панели */}
            <Route
              path="/board/:boardId"
              element={
                <RequireAuth>
                  <BoardPage />
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
