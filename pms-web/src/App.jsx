import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import EndUserDashboard from './pages/EndUserDashboard';
import CreateTicket from './pages/CreateTicket';
import TicketDetails from './pages/TicketDetails';
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets/:id"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <TicketDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          {/* Developer routes */}
          <Route
            path="/developer"
            element={
              <ProtectedRoute allowedRoles={['Developer']}>
                <DeveloperDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developer/tickets/:id"
            element={
              <ProtectedRoute allowedRoles={['Developer']}>
                <TicketDetails />
              </ProtectedRoute>
            }
          />

          {/* EndUser routes */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={['EndUser']}>
                <EndUserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/create-ticket"
            element={
              <ProtectedRoute allowedRoles={['EndUser']}>
                <CreateTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/tickets/:id"
            element={
              <ProtectedRoute allowedRoles={['EndUser']}>
                <TicketDetails />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
