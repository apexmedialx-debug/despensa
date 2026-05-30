'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { setAccessToken, setRefreshCallback, api } from '@/lib/api'

export type User = {
  id: string
  name: string
  email: string
  role: 'SHOPPER' | 'DEPENDENT'
  avatarColor: string
  avatarInitials: string
  householdId: string | null
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (name: string, email: string, password: string, householdName?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<Pick<User, 'name' | 'avatarInitials' | 'avatarColor'>>) => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshingRef = useRef(false)

  const doRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null
    refreshingRef.current = true
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        setUser(null)
        setAccessToken(null)
        return null
      }
      const data = await res.json()
      setAccessToken(data.accessToken)
      setUser(data.user)
      return data.accessToken
    } catch {
      setUser(null)
      setAccessToken(null)
      return null
    } finally {
      refreshingRef.current = false
    }
  }, [])

  // Register the refresh callback so api.ts can use it
  useEffect(() => {
    setRefreshCallback(doRefresh)
  }, [doRefresh])

  // Attempt silent refresh on app load
  useEffect(() => {
    doRefresh().finally(() => setIsLoading(false))
  }, [doRefresh])

  async function login(email: string, password: string, rememberMe = false) {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password, rememberMe })
    setAccessToken(res.accessToken)
    setUser(res.user)
  }

  async function register(name: string, email: string, password: string, householdName?: string) {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/register', {
      name, email, password, householdName,
    })
    setAccessToken(res.accessToken)
    setUser(res.user)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    setAccessToken(null)
    setUser(null)
  }

  async function updateProfile(data: Partial<Pick<User, 'name' | 'avatarInitials' | 'avatarColor'>>) {
    const res = await api.patch<{ user: User }>('/auth/me', data)
    setUser(res.user)
  }

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user, login, register, logout, updateProfile, setUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
