import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

export function calculateTaskStats(tasks: any[], date: Date) {
  const weekStart = startOfWeek(date)
  const weekEnd = endOfWeek(date)
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const weekTasks = tasks.filter(task => 
    task.dueDate && isWithinInterval(new Date(task.dueDate), { start: weekStart, end: weekEnd })
  )
  
  const monthTasks = tasks.filter(task => 
    task.dueDate && isWithinInterval(new Date(task.dueDate), { start: monthStart, end: monthEnd })
  )

  return {
    day: {
      total: tasks.filter(t => t.dueDate && isWithinInterval(new Date(t.dueDate), 
        { start: date, end: new Date(date.setHours(23, 59, 59)) })).length,
      completed: tasks.filter(t => t.completed && t.dueDate && isWithinInterval(new Date(t.dueDate), 
        { start: date, end: new Date(date.setHours(23, 59, 59)) })).length,
    },
    week: {
      total: weekTasks.length,
      completed: weekTasks.filter(t => t.completed).length,
      highPriority: weekTasks.filter(t => t.priority === 'high').length,
    },
    month: {
      total: monthTasks.length,
      completed: monthTasks.filter(t => t.completed).length,
      byCategory: monthTasks.reduce((acc: {[key: string]: number}, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1
        return acc
      }, {}),
    }
  }
} 