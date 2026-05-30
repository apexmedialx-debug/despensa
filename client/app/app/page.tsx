'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Apple, ShoppingCart, Users, BarChart3, Plus, Minus, Check, X,
  AlertCircle, Filter, Bell, LogOut, Settings, Copy, RefreshCw,
  Loader2, Trash2, Crown, UserCheck,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

import { useAuth } from '@/context/AuthContext'
import { useItems, useUpdateItem, useCreateItem, useDeleteItem } from '@/hooks/useItems'
import { useRequests, useCreateRequest, useResolveRequest } from '@/hooks/useRequests'
import { useSpending } from '@/hooks/useSpending'
import { useHousehold, useUpdateMember, useRemoveMember, useRegenerateInvite } from '@/hooks/useHousehold'
import { api } from '@/lib/api'

// Push notification setup
const VAPID_KEY = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_VAPID_KEY || '') : ''

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    const { publicKey } = await api.get<{ publicKey: string | null }>('/push/vapid-public-key') as any
    if (!publicKey) return
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await api.patch('/auth/me', { pushSubscription: JSON.stringify(sub) })
  } catch {}
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function AppPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const { data: items = [], isLoading: itemsLoading } = useItems()
  const { data: requests = [], isLoading: reqLoading } = useRequests()
  const { data: spending } = useSpending()
  const { data: household } = useHousehold()

  const updateItem = useUpdateItem()
  const createItem = useCreateItem()
  const deleteItem = useDeleteItem()
  const createRequest = useCreateRequest()
  const resolveRequest = useResolveRequest()
  const updateMember = useUpdateMember()
  const removeMember = useRemoveMember()
  const regenerateInvite = useRegenerateInvite()

  const [listFilter, setListFilter] = useState<'all' | 'shared' | 'personal'>('all')
  const [editDialog, setEditDialog] = useState<{ open: boolean; item?: any }>({ open: false })
  const [newItemDialog, setNewItemDialog] = useState(false)
  const [newItemForm, setNewItemForm] = useState({ name: '', qty: 1, maxQty: 6, unit: 'unid', category: 'Despensa', pricePerUnit: 0, threshold: 1, isShared: false })
  const [requestText, setRequestText] = useState('')
  const [profileDialog, setProfileDialog] = useState(false)
  const [householdDialog, setHouseholdDialog] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login')
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      registerPush().catch(() => {})
    }
  }, [isAuthenticated])

  const lowStockItems = useMemo(() => items.filter(i => i.qty <= i.threshold), [items])
  const shoppingList = useMemo(() => lowStockItems.map(i => ({ ...i, suggestedQty: Math.max(0, i.maxQty - i.qty) })), [lowStockItems])

  const filteredItems = useMemo(() => {
    if (listFilter === 'shared') return items.filter(i => i.isShared)
    if (listFilter === 'personal') return items.filter(i => !i.isShared && i.ownerId === user?.id)
    return items
  }, [items, listFilter, user?.id])

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'PENDING'), [requests])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user) return null

  const isShopper = user.role === 'SHOPPER'

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  async function handleAddItem() {
    if (!newItemForm.name.trim()) return
    await createItem.mutateAsync({ ...newItemForm, ownerId: newItemForm.isShared ? null : (user?.id ?? null) } as any)
    setNewItemDialog(false)
    setNewItemForm({ name: '', qty: 1, maxQty: 6, unit: 'unid', category: 'Despensa', pricePerUnit: 0, threshold: 1, isShared: false })
  }

  async function handleSaveEdit() {
    if (!editDialog.item) return
    await updateItem.mutateAsync({ id: editDialog.item.id, data: { qty: editDialog.item.qty } })
    setEditDialog({ open: false })
  }

  async function handleRestock(item: any) {
    await updateItem.mutateAsync({ id: item.id, data: { qty: item.maxQty } })
    toast.success(`${item.name} reposto!`)
  }

  async function handleSendRequest() {
    if (!requestText.trim()) return
    await createRequest.mutateAsync(requestText)
    setRequestText('')
  }

  async function copyInviteCode() {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode)
      toast.success('Código copiado!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/95 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-2">
                <Apple className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Despensa</h1>
                <p className="text-sm text-muted-foreground">{household?.name || 'Gestor de inventário'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Low stock bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-full p-2 hover:bg-muted transition-colors"
                >
                  <Bell className="h-5 w-5 text-foreground" />
                  {lowStockItems.length > 0 && (
                    <span className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                      {lowStockItems.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-background shadow-lg z-50">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold text-foreground">Stock Baixo</h3>
                    </div>
                    <ScrollArea className="h-48">
                      <div className="space-y-2 p-4">
                        {lowStockItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center">Tudo bem abastecido!</p>
                        ) : lowStockItems.map(item => (
                          <div key={item.id} className="p-3 rounded-lg border border-border/50 flex gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.qty} {item.unit} restante(s)</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* User avatar + dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 rounded-full hover:bg-muted px-2 py-1 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      style={{ backgroundColor: user.avatarColor }}
                      className="text-white font-semibold text-sm"
                    >
                      {user.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => setHouseholdDialog(true)}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      <Settings className="h-4 w-4" /> Gerir Casa
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted text-red-600"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {lowStockItems.length > 0 && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {lowStockItems.length} item(s) com stock baixo — verifique a lista de compras
            </p>
          </div>
        )}

        <Tabs defaultValue="pantry" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pantry" className="gap-1 text-xs sm:text-sm">
              <Apple className="h-4 w-4" /><span className="hidden sm:inline">Despensa</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-1 text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Compras</span>
              {shoppingList.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{shoppingList.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" /><span className="hidden sm:inline">Pedidos</span>
              {pendingRequests.length > 0 && <Badge className="ml-1 text-xs">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="spending" className="gap-1 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Gastos</span>
            </TabsTrigger>
          </TabsList>

          {/* ── PANTRY TAB ── */}
          <TabsContent value="pantry" className="space-y-6 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Inventário Atual</h2>
                <p className="text-sm text-muted-foreground">{filteredItems.length} itens</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'shared', 'personal'] as const).map(f => (
                  <Button key={f} variant={listFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setListFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'shared' ? 'Comunidade' : 'Pessoal'}
                  </Button>
                ))}
                {isShopper && (
                  <Button onClick={() => setNewItemDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700" size="sm">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                )}
              </div>
            </div>

            {itemsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map(item => {
                  const isLow = item.qty <= item.threshold
                  const fillPct = Math.min(100, (item.qty / Math.max(item.maxQty, 1)) * 100)
                  const owner = household?.members.find(m => m.id === item.ownerId)

                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isLow ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' : ''}`}
                      onClick={() => setEditDialog({ open: true, item: { ...item } })}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <CardDescription className="text-xs">{item.category}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.isShared && <Badge variant="secondary" className="text-xs">Comunidade</Badge>}
                            {isLow && <AlertCircle className="h-5 w-5 text-red-500" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{item.qty}</span>
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                        <Progress value={fillPct} className="h-2" />
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1">
                            {owner ? (
                              <>
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback style={{ backgroundColor: owner.avatarColor }} className="text-white text-xs">{owner.avatarInitials}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{owner.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Partilhado</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">Mín: {item.threshold}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Edit Item Dialog */}
            <Dialog open={editDialog.open} onOpenChange={o => setEditDialog({ open: o })}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Item</DialogTitle>
                  <DialogDescription>{editDialog.item?.name}</DialogDescription>
                </DialogHeader>
                {editDialog.item && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 justify-center">
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0"
                        onClick={() => setEditDialog(d => ({ ...d, item: { ...d.item, qty: Math.max(0, d.item.qty - 1) } }))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">{editDialog.item.qty}</span>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0"
                        onClick={() => setEditDialog(d => ({ ...d, item: { ...d.item, qty: d.item.qty + 1 } }))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">{editDialog.item.unit}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setEditDialog({ open: false })}>Cancelar</Button>
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSaveEdit} disabled={updateItem.isPending}>
                        {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                      </Button>
                    </div>
                    {isShopper && (
                      <Button variant="destructive" className="w-full" onClick={async () => {
                        await deleteItem.mutateAsync(editDialog.item.id)
                        setEditDialog({ open: false })
                      }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar Item
                      </Button>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Add Item Dialog */}
            <Dialog open={newItemDialog} onOpenChange={setNewItemDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Item</DialogTitle>
                  <DialogDescription>Adicionar novo item à despensa</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input placeholder="ex: Leite" value={newItemForm.name} onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Qtd. Atual</label>
                      <Input type="number" min="0" value={newItemForm.qty} onChange={e => setNewItemForm(f => ({ ...f, qty: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Qtd. Máxima</label>
                      <Input type="number" min="0" value={newItemForm.maxQty} onChange={e => setNewItemForm(f => ({ ...f, maxQty: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unidade</label>
                      <Input placeholder="L, kg, unid..." value={newItemForm.unit} onChange={e => setNewItemForm(f => ({ ...f, unit: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stock Mínimo</label>
                      <Input type="number" min="0" value={newItemForm.threshold} onChange={e => setNewItemForm(f => ({ ...f, threshold: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoria</label>
                      <select value={newItemForm.category} onChange={e => setNewItemForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm">
                        {['Despensa', 'Laticínios', 'Padaria', 'Bebidas', 'Frutas & Legumes', 'Carne & Peixe', 'Higiene', 'Limpeza'].map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preço/Unid (€)</label>
                      <Input type="number" min="0" step="0.01" value={newItemForm.pricePerUnit} onChange={e => setNewItemForm(f => ({ ...f, pricePerUnit: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isShared" checked={newItemForm.isShared} onChange={e => setNewItemForm(f => ({ ...f, isShared: e.target.checked }))} className="rounded" />
                    <label htmlFor="isShared" className="text-sm font-medium cursor-pointer">Item da Comunidade</label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setNewItemDialog(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAddItem} disabled={createItem.isPending}>
                      {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── SHOPPING TAB ── */}
          <TabsContent value="shopping" className="space-y-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Lista de Compras</h2>
              <p className="text-sm text-muted-foreground">Itens abaixo do nível mínimo</p>
            </div>
            {shoppingList.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">Tudo está bem abastecido!</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {shoppingList.map(item => (
                  <Card key={item.id} className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Atual: {item.qty} {item.unit} • Sugerido: +{item.suggestedQty} {item.unit}
                        </p>
                        {item.isShared && <Badge className="mt-1 text-xs">Comunidade</Badge>}
                      </div>
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleRestock(item)} disabled={updateItem.isPending}>
                        <Check className="h-4 w-4" /> Reposto
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── REQUESTS TAB ── */}
          <TabsContent value="requests" className="space-y-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Pedidos da Família</h2>
              <p className="text-sm text-muted-foreground">Itens solicitados pelos membros</p>
            </div>

            {/* Send request */}
            <Card>
              <CardHeader><CardTitle className="text-base">Novo Pedido</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="ex: Sumo de laranja — 1 cartão"
                    value={requestText}
                    onChange={e => setRequestText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendRequest() }}
                  />
                  <Button onClick={handleSendRequest} disabled={!requestText.trim() || createRequest.isPending}
                    className="bg-blue-600 hover:bg-blue-700">
                    {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {reqLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
              ))}</div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <Card key={req.id} className={req.status !== 'PENDING' ? 'opacity-60' : ''}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex-1 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: req.from.avatarColor }} className="text-white text-xs font-semibold">
                            {req.from.avatarInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{req.text}</p>
                            {req.status === 'APPROVED' && <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Aprovado</Badge>}
                            {req.status === 'DECLINED' && <Badge variant="destructive" className="text-xs">Recusado</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{req.from.name} • {new Date(req.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                      </div>
                      {req.status === 'PENDING' && isShopper && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:bg-green-100"
                            onClick={() => resolveRequest.mutate({ id: req.id, status: 'APPROVED' })}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                            onClick={() => resolveRequest.mutate({ id: req.id, status: 'DECLINED' })}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── SPENDING TAB ── */}
          <TabsContent value="spending" className="space-y-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Resumo de Gastos</h2>
              <p className="text-sm text-muted-foreground">Valor estimado da despensa</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{spending?.totalPantryValue.toFixed(2)}€</div>
                  <p className="text-xs text-muted-foreground pt-1">stock atual</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Reabastecimento</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{spending?.restockEstimate.toFixed(2)}€</div>
                  <p className="text-xs text-muted-foreground pt-1">estimativa</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Itens em Falta</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{spending?.lowStockCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground pt-1">abaixo do mínimo</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{Object.keys(spending?.perCategory ?? {}).length}</div>
                  <p className="text-xs text-muted-foreground pt-1">categorias ativas</p></CardContent></Card>
            </div>

            {spending && Object.keys(spending.perUser).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Por Pessoa</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {Object.values(spending.perUser).sort((a, b) => b.total - a.total).map(entry => (
                    <div key={entry.user.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback style={{ backgroundColor: entry.user.avatarColor }} className="text-white text-xs">{entry.user.avatarInitials}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium">{entry.user.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{entry.total.toFixed(2)}€</span>
                      </div>
                      <Progress value={spending.totalPantryValue ? (entry.total / spending.totalPantryValue) * 100 : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground">Próprio: {entry.ownValue.toFixed(2)}€ + Partilha: {entry.sharedPortion.toFixed(2)}€</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {spending && Object.keys(spending.perCategory).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Por Categoria</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(spending.perCategory).sort(([, a], [, b]) => b - a).map(([cat, val]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm">{cat}</span>
                      <span className="text-sm font-semibold">{(val as number).toFixed(2)}€</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Household Management Dialog */}
      <Dialog open={householdDialog} onOpenChange={setHouseholdDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerir Casa — {household?.name}</DialogTitle>
            <DialogDescription>Membros e configurações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Invite code */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Código de Convite</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-lg tracking-widest text-center">{household?.inviteCode}</code>
                <Button size="sm" variant="outline" onClick={copyInviteCode}><Copy className="h-4 w-4" /></Button>
                {isShopper && (
                  <Button size="sm" variant="outline" onClick={() => regenerateInvite.mutate()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {/* Members */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Membros ({household?.members.length})</p>
              {household?.members.map(member => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: member.avatarColor }} className="text-white text-sm">{member.avatarInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant={member.role === 'SHOPPER' ? 'default' : 'secondary'} className="text-xs">
                    {member.role === 'SHOPPER' ? 'Gestor' : 'Membro'}
                  </Badge>
                  {isShopper && member.id !== user.id && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => updateMember.mutate({ id: member.id, role: member.role === 'SHOPPER' ? 'DEPENDENT' : 'SHOPPER' })}
                        title={member.role === 'SHOPPER' ? 'Rebaixar' : 'Promover'}>
                        {member.role === 'SHOPPER' ? <UserCheck className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                        onClick={() => removeMember.mutate(member.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
