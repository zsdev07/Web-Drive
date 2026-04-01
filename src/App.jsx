import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import DrivePage from './pages/DrivePage'

export default function App() {
  const { isAuthed } = useAuth()
  return (
    <Routes>
      <Route path="/auth" element={!isAuthed ? <AuthPage /> : <Navigate to="/" replace />} />
      <Route path="/*" element={isAuthed ? <DrivePage /> : <Navigate to="/auth" replace />} />
    </Routes>
  )
    }
