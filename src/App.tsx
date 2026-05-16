import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPage } from '@/pages/ResetPage';
import { ExplorerPage } from '@/pages/ExplorerPage';

const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TrashPage    = lazy(() => import('@/pages/TrashPage').then((m) => ({ default: m.TrashPage })));
const SharePage    = lazy(() => import('@/pages/SharePage').then((m) => ({ default: m.SharePage })));

function PublicFallback() {
  return <div className="center-screen">ЗАГРУЗКА…</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset" element={<ResetPage />} />
      <Route
        path="/share/:token"
        element={
          <Suspense fallback={<PublicFallback />}>
            <SharePage />
          </Suspense>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ExplorerPage />} />
        <Route path="/folders/:folderId" element={<ExplorerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/trash" element={<TrashPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
