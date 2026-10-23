import { useEditorStore } from '../state/useEditorStore'
import { OBJECT_CATALOG } from '../objects/catalog'
import type { ObjectTypeKey } from '../../../types/layout'

export type EditMessage =
  | { op: 'select'; id: string | null }
  | { op: 'move'; id: string; x: number; y: number }
  | { op: 'rotate'; id: string; deltaDeg: number }
  | { op: 'delete' | 'duplicate'; id: string }
  | { op: 'add'; objectType: string; x: number; y: number }
  | { op: 'undo' | 'redo' }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** Aplica um pedido de edição vindo do 3D com as mesmas ações da prancheta 2D (histórico de
 * desfazer, salvamento automático). Mensagens malformadas ou para objetos inexistentes são
 * ignoradas. */
export function applyEditFrom3D(msg: EditMessage): void {
  const s = useEditorStore.getState()
  const exists = (id: string) => s.objects.some((o) => o.id === id)
  switch (msg.op) {
    case 'select':
      if (msg.id === null || (isId(msg.id) && exists(msg.id))) s.selectObject(msg.id)
      break
    case 'move':
      if (isId(msg.id) && exists(msg.id) && isNum(msg.x) && isNum(msg.y)) s.commitObject(msg.id, { x: Math.round(msg.x), y: Math.round(msg.y) })
      break
    case 'rotate':
      if (isId(msg.id) && exists(msg.id) && isNum(msg.deltaDeg)) s.rotateObject(msg.id, msg.deltaDeg)
      break
    case 'delete':
      if (isId(msg.id) && exists(msg.id)) s.deleteObject(msg.id)
      break
    case 'duplicate':
      if (isId(msg.id) && exists(msg.id)) s.duplicateObject(msg.id)
      break
    case 'add':
      if (typeof msg.objectType === 'string' && Object.hasOwn(OBJECT_CATALOG, msg.objectType) && isNum(msg.x) && isNum(msg.y)) s.addObject(msg.objectType as ObjectTypeKey, msg.x, msg.y)
      break
    case 'undo':
      s.undo()
      break
    case 'redo':
      s.redo()
      break
  }
}
