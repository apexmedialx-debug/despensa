import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SpendingData = {
  totalPantryValue: number
  perUser: Record<string, {
    user: { id: string; name: string; avatarInitials: string; avatarColor: string }
    ownValue: number
    sharedPortion: number
    total: number
  }>
  perCategory: Record<string, number>
  restockEstimate: number
  lowStockCount: number
}

export function useSpending() {
  return useQuery<SpendingData>({
    queryKey: ['spending'],
    queryFn: async () => {
      const res = await api.get<{ spending: SpendingData }>('/spending')
      return res.spending
    },
  })
}
