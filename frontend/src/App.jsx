import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminKalenderPage from './pages/AdminKalenderPage';
import {
  VikarLektionerPage,
  VikarTilgaengelighedPage,
  UautorisPage,
} from './pages/PlaceholderPages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/uautoriseret" element={<UautorisPage />} />

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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}