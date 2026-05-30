import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export type Item = {
  id: string
  name: string
  ownerId: string | null
  isShared: boolean
  qty: number
  maxQty: number
  unit: string
  pricePerUnit: number
  category: string
  threshold: number
  householdId: string
  createdAt: string
  updatedAt: string
}

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await api.get<{ items: Item[] }>('/items')
      return res.items
    },
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Item> }) =>
      api.patch<{ item: Item }>(`/items/${id}`, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['items'] })
      const prev = qc.getQueryData<Item[]>(['items'])
      qc.setQueryData<Item[]>(['items'], old =>
        old?.map(i => (i.id === id ? { ...i, ...data } : i)) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['items'], ctx.prev)
      toast.error('Erro ao atualizar item')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Item, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) =>
      api.post<{ item: Item }>('/items', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item adicionado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item removido')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
