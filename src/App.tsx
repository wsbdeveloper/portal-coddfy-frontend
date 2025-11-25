/**
 * Aplicação principal React
 * Configura rotas e autenticação
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import Consultants from './pages/Consultants';
import Billing from './pages/Billing';
import Partners from './pages/Partners';
import Login from './pages/Login';

// Componente para proteger rotas que requerem autenticação
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="consultants" element={<Consultants />} />
          <Route path="billing" element={<Billing />} />
          <Route path="partners" element={<Partners />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;


