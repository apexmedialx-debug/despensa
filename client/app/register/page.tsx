'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Apple } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', householdName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('As passwords não coincidem')
      return
    }
    if (form.password.length < 8) {
      setError('A password precisa de ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.householdName || undefined)
      router.replace('/app')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
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
              <Apple className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>Junta-te à tua despensa familiar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Completo</label>
              <Input placeholder="O teu nome" value={form.name} onChange={set('name')} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="tu@exemplo.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Password</label>
              <Input type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Casa <span className="text-muted-foreground">(opcional)</span></label>
              <Input placeholder="ex: A Nossa Casa" value={form.householdName} onChange={set('householdName')} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'A criar conta...' : 'Criar Conta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tens conta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Entrar
              </Link>
            </p>
            <div className="border-t pt-4">
              <p className="text-center text-xs text-muted-foreground">
                Ao registar, tornas-te automaticamente SHOPPER (gestor da casa). <br />
                Para te juntares a uma casa existente, usa o código de convite.
              </p>
              <div className="mt-3 text-center">
                <Link href="/onboarding" className="text-sm text-blue-600 hover:underline">
                  Tens um código de convite? Entra aqui →
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
