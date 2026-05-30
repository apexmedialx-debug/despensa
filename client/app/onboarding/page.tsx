'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Apple, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, setUser } = useAuth()
  const router = useRouter()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ user: any; household: any }>('/household/join', { inviteCode })
      setUser(res.user)
      router.replace('/app')
    } catch (err: any) {
      setError(err.message || 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Juntar a uma Casa</CardTitle>
          <CardDescription>Introduz o código de convite</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código de Convite</label>
              <Input
                placeholder="ex: PANTRY"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className="uppercase tracking-widest text-center text-lg font-mono"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'A juntar...' : 'Juntar'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => router.replace('/app')}>
              Criar nova casa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
