import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import PrivateRoute from './components/PrivateRoute';
import FirebaseStatus from './components/FirebaseStatus';
import './App.css';

function DashboardRouter() {
  const { userProfile } = useAuth();
  
  if (userProfile === 'coordinator') {
    return <CoordinatorDashboard />;
  }
  
  return <Dashboard />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardRouter />
                </PrivateRoute>
              }
            />
            <Route path="/firebase-status" element={<FirebaseStatus />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
