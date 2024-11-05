import { prisma } from '@/lib/db'
import { pusher } from '@/lib/pusher'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create the task with proper date handling
    const task = await prisma.task.create({
      data: {
        title: body.title,
        completed: false,
        category: body.category || 'Personal',
        recurrence: body.recurrence || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        reminder: body.reminder ? new Date(body.reminder) : null,
        priority: body.priority || 'medium',
        isRecurring: Boolean(body.isRecurring),
      }
    })

    // Trigger Pusher event for real-time update
    await pusher.trigger('tasks', 'task-added', task)
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
} 