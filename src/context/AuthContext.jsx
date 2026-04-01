import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'zxdrive_session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })

  const login = (data) => {
    // data: { sessionId, userId, firstName, lastName, phone, channelId, apiId, apiHash }
    setSession(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const logoutLocal = () => {
    setSession(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ session, login, logoutLocal, isAuthed: !!session }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
