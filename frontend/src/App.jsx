import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import {
  AdminFravaerPage,
  AdminTildelingerPage,
  AdminLektionerPage,
  AdminLaererePage,
  AdminVikarePage,
  VikarLektionerPage,
  VikarTilgaengelighedPage,
  UautorisPage,
} from './pages/PlaceholderPages';

/**
 * App.jsx definerer udelukkende routing og providers.
 * Al forretningslogik ligger i services og hooks.
 * Al præsentation ligger i pages og components.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Offentlig rute */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/uautoriseret" element={<UautorisPage />} />

          {/* Admin-ruter */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute rolle="admin">
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="fravaer" replace />} />
            <Route path="fravaer"     element={<AdminFravaerPage />} />
            <Route path="tildelinger" element={<AdminTildelingerPage />} />
            <Route path="lektioner"   element={<AdminLektionerPage />} />
            <Route path="laerere"     element={<AdminLaererePage />} />
            <Route path="vikarer"     element={<AdminVikarePage />} />
          </Route>

          {/* Vikar-ruter */}
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
