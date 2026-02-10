import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LockScreenProvider, useLockScreen } from './hooks/useLockScreen';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LockScreen from './components/LockScreen';
import AuthPage from './pages/AuthPage';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/AdminDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import EndUserDashboard from './pages/EndUserDashboard';
import CreateTicket from './pages/CreateTicket';
import TicketDetails from './pages/TicketDetails';
import UserManagement from './pages/UserManagement';

// Wrapper component that shows lock screen when locked
function AppWithLock({ children }) {
  const { user } = useAuth();
  const { isLocked } = useLockScreen();

  // Only show lock screen if user is logged in and screen is locked
  if (user && isLocked) {
    return <LockScreen />;
  }

  return children;
}

// Protected layout wrapper
function ProtectedLayout({ allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <LockScreenProvider>
            <AppWithLock>
              <Routes>
                {/* Public routes - AuthPage is the landing page */}
                <Route path="/" element={<AuthPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Admin routes - nested under AppLayout */}
                <Route element={<ProtectedLayout allowedRoles={['Admin']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/tickets/:id" element={<TicketDetails />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                </Route>

                {/* Developer routes - nested under AppLayout */}
                <Route element={<ProtectedLayout allowedRoles={['Developer']} />}>
                  <Route path="/developer" element={<DeveloperDashboard />} />
                  <Route path="/developer/tickets/:id" element={<TicketDetails />} />
                </Route>

                {/* EndUser routes - nested under AppLayout */}
                <Route element={<ProtectedLayout allowedRoles={['EndUser']} />}>
                  <Route path="/user" element={<EndUserDashboard />} />
                  <Route path="/user/create-ticket" element={<CreateTicket />} />
                  <Route path="/user/tickets/:id" element={<TicketDetails />} />
                </Route>

                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppWithLock>
          </LockScreenProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;


