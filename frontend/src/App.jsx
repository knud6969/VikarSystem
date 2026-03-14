import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminKalenderPage from './pages/AdminKalenderPage';
import VikarLektionerPage from './pages/VikarLektionerPage';
import VikarTilgaengelighedPage from './pages/VikarTilgaengelighedPage';
import LaererLektionerPage from './pages/LaererLektionerPage';
import { UautorisPage } from './pages/PlaceholderPages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/uautoriseret" element={<UautorisPage />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolle="admin">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="kalender" replace />} />
            <Route path="kalender" element={<AdminKalenderPage />} />
          </Route>

          {/* Vikar */}
          <Route
            path="/vikar"
            element={
              <ProtectedRoute rolle="vikar">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="lektioner" replace />} />
            <Route path="lektioner"       element={<VikarLektionerPage />} />
            <Route path="tilgaengelighed" element={<VikarTilgaengelighedPage />} />
          </Route>

          {/* Lærer */}
          <Route
            path="/laerer"
            element={
              <ProtectedRoute rolle="laerer">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="lektioner" replace />} />
            <Route path="lektioner" element={<LaererLektionerPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}