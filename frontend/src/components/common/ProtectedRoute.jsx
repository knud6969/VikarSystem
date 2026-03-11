import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Beskytter ruter med krav om login og eventuelt specifik rolle.
 * Omdirigerer til /login hvis ikke autentificeret.
 * Omdirigerer til /uautoriseret hvis forkert rolle.
 *
 * @param {string} [rolle] - Påkrævet rolle ('admin' | 'vikar'). Valgfri.
 */
export default function ProtectedRoute({ children, rolle }) {
  const { bruger, loading } = useAuth();

  if (loading) return null;

  if (!bruger) {
    return <Navigate to="/login" replace />;
  }

  if (rolle && bruger.rolle !== rolle) {
    return <Navigate to="/uautoriseret" replace />;
  }

  return children;
}
