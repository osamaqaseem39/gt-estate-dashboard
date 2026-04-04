 'use client'

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import type { AxiosResponse } from 'axios'
import { api } from '@/lib/api'
 
 interface User {
   id: string
   email: string
   name: string
   role: string
 }
 
 interface AuthContextType {
   user: User | null
   loading: boolean
   login: (email: string, password: string) => Promise<void>
   logout: () => void
 }
 
const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
   const [user, setUser] = useState<User | null>(null)
   const [loading, setLoading] = useState(true)
 
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token && token !== 'undefined') {
      api
        .get<User>('/auth/profile')
        .then((response: AxiosResponse<User>) => {
          setUser(response.data)
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      if (token === 'undefined') localStorage.removeItem('auth_token')
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      token?: string
      access_token?: string
      user: { id: string; email: string; role: string; username?: string; name?: string }
    }>('/auth/login', { email, password })
    const token = response.data.token ?? response.data.access_token
    if (!token) {
      throw new Error('Login response did not include a token')
    }
    const userData = response.data.user
    localStorage.setItem('auth_token', token)
    setUser({
      id: String(userData.id),
      email: userData.email,
      name: userData.username ?? userData.name ?? '',
      role: userData.role,
    })
  }
 
   const logout = () => {
     localStorage.removeItem('auth_token')
     setUser(null)
   }
 
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
 
 export function useAuth() {
   const context = useContext(AuthContext)
   if (context === undefined) {
     throw new Error('useAuth must be used within an AuthProvider')
   }
   return context
 }
