import { prisma } from '@/lib/db'
import { pusher } from '@/lib/pusher'
import { NextResponse } from 'next/server'
import { getNextDueDate } from '@/lib/taskUtils'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const taskId = parseInt(params.id)
    
    // Get the current task
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update the current task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { 
        completed: body.completed,
        lastCompleted: body.completed ? new Date() : null
      }
    })

    // If task is recurring and completed, create next occurrence
    if (currentTask.isRecurring && body.completed && currentTask.dueDate) {
      const nextDueDate = getNextDueDate(currentTask.recurrence!, new Date(currentTask.dueDate))
      
      const newTask = await prisma.task.create({
        data: {
          title: currentTask.title,
          category: currentTask.category,
          isRecurring: true,
          recurrence: currentTask.recurrence,
          dueDate: nextDueDate,
          reminder: currentTask.reminder ? getNextDueDate(currentTask.recurrence!, new Date(currentTask.reminder)) : null,
        }
      })

      await pusher.trigger('tasks', 'task-added', newTask)
    }
    
    await pusher.trigger('tasks', 'task-updated', updatedTask)
    return NextResponse.json(updatedTask)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating task' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id)
    await prisma.task.delete({
      where: { id: taskId }
    })
    
    // Trigger Pusher event for real-time update
    await pusher.trigger('tasks', 'task-deleted', { id: taskId })
    
    return NextResponse.json({ message: 'Task deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting task' }, { status: 500 })
  }
} 