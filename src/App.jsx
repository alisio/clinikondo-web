import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProcessingProvider } from './contexts/ProcessingContext'
import { FamilyProvider } from './contexts/FamilyContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Páginas de autenticação
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Páginas principais
import DashboardPage from './pages/DashboardPage'
import ProcessorPage from './pages/ProcessorPage'
import PatientsPage from './pages/PatientsPage'
import FilesPage from './pages/FilesPage'
import FamilyPage from './pages/FamilyPage'

// Componentes
import LoadingScreen from './components/ui/LoadingScreen'

// Proteção de rotas
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      {/* Rotas públicas (login/registro) */}
      <Route element={
        <PublicRoute>
          <AuthLayout />
        </PublicRoute>
      }>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Rotas protegidas (app principal) */}
      <Route element={
        <PrivateRoute>
          <ProcessingProvider>
            <FamilyProvider>
              <MainLayout />
            </FamilyProvider>
          </ProcessingProvider>
        </PrivateRoute>
      }>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/processor" element={<ProcessorPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/family" element={<FamilyPage />} />
      </Route>

      {/* 404 - Redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
