import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';

import Layout from './layouts/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Dashboard2Page from './pages/Dashboard2Page';
import AdminRolesPage from './pages/AdminRolesPage';
import CreateWorkspacePage from './pages/CreateWorkspacePage';
import WorkspaceListPage from './pages/WorkspaceListPage';
import WorkspaceDetailPage from './pages/WorkspaceDetailPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import LinksPage from './pages/LinksPage';
import ChatPage from './pages/ChatPage';
import ChannelChatPage from './pages/ChannelChatPage';
import WorkspaceChannelRedirectPage from './pages/WorkspaceChannelRedirectPage';
import  ChannelDetailPage from './pages/ChannelDetailPage';
import MesDocumentsPage from "./pages/MesDocumentsPage";
import MentionsPage from "./pages/MentionsPage";

function App() {
  const { darkMode } = useTheme();

  return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="h-screen w-screen overflow-hidden m-0 p-0">
          <Router>
            <Routes>
              {/* Redirection par défaut */}
              <Route path="/" element={<Navigate to="/login" />} />

              {/* Routes publiques */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Routes privées avec Layout + Sidebar */}
              <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="dashboard2" element={<Dashboard2Page />} />
                <Route path="admin/roles" element={<AdminRolesPage />} />
                <Route path="workspaces" element={<WorkspaceListPage />} />
                <Route path="workspaces/create" element={<CreateWorkspacePage />} />
                <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
                <Route path="workspaces/:id/channels/:channelId" element={<ChannelChatPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="links" element={<LinksPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="workspaces/:id/channels" element={<WorkspaceChannelRedirectPage />} />
                <Route path="/channels/:channelId" element={<ChannelDetailPage />} />
                <Route path="/documents" element={<MesDocumentsPage />} />
                <Route path="/mentions" element={<MentionsPage />} />
              </Route>
            </Routes>
          </Router>
        </div>
      </div>
  );
}

export default App;
