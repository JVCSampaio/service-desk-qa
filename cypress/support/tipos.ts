// Tipos espelhados do contrato da API (app/contracts.py do ServiceDesk).

export type Status = 'open' | 'in_progress' | 'resolved'
export type Prioridade = 'low' | 'normal' | 'high' | 'urgent'

export interface Chamado {
  id: number
  title: string
  description: string
  requester: string
  category: string
  priority: Prioridade
  status: Status
  assignee: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  version: number
  due_at: string
  overdue: boolean
  sla_met: boolean | null
}

export interface Evento {
  id: number
  ticket_id: number
  kind: 'created' | 'updated' | 'transition' | 'comment'
  note: string
  created_at: string
}

export interface Detalhe {
  ticket: Chamado
  events: Evento[]
}

export interface Metricas {
  total: number
  active: number
  urgent: number
  overdue: number
  resolved: number
  sla_rate: number | null
}

/** Corpo de criação; aceita campos extras para os testes de contrato. */
export type NovoChamado = Record<string, unknown>
