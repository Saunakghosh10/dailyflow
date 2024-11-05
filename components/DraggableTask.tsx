'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from "@/lib/utils"
import { Checkbox } from '@radix-ui/react-checkbox'

interface DraggableTaskProps {
  id: number
  title: string
  completed: boolean
  priority: string
  onToggle: () => void
}

export function DraggableTask({ id, title, completed, priority, onToggle }: DraggableTaskProps) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: `task-${id}`,
    data: { id, type: 'task' }
  })

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined

  const priorityColors = {
    high: 'bg-red-100 border-red-300',
    medium: 'bg-yellow-100 border-yellow-300',
    low: 'bg-green-100 border-green-300'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center p-2 rounded-md border cursor-move",
        priorityColors[priority as keyof typeof priorityColors],
        completed && "opacity-50"
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <span className={cn("ml-2", completed && "line-through")}>{title}</span>
    </div>
  )
} 