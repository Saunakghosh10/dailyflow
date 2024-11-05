import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export function calculateTaskStats(tasks: any[], date: Date) {
  // Ensure date is a Date object
  const currentDate = new Date(date)
  
  // Set up time intervals
  const dayStart = startOfDay(currentDate)
  const dayEnd = endOfDay(currentDate)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Start week on Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Filter tasks for each time period
  const dayTasks = tasks.filter(task => 
    task.dueDate && isWithinInterval(new Date(task.dueDate), { start: dayStart, end: dayEnd })
  )

  const weekTasks = tasks.filter(task => 
    task.dueDate && isWithinInterval(new Date(task.dueDate), { start: weekStart, end: weekEnd })
  )
  
  const monthTasks = tasks.filter(task => 
    task.dueDate && isWithinInterval(new Date(task.dueDate), { start: monthStart, end: monthEnd })
  )

  // Calculate completion percentages
  const dayCompletion = dayTasks.length > 0 
    ? Math.round((dayTasks.filter(t => t.completed).length / dayTasks.length) * 100) 
    : 0

  const weekCompletion = weekTasks.length > 0 
    ? Math.round((weekTasks.filter(t => t.completed).length / weekTasks.length) * 100)
    : 0

  const monthCompletion = monthTasks.length > 0 
    ? Math.round((monthTasks.filter(t => t.completed).length / monthTasks.length) * 100)
    : 0

  return {
    day: {
      total: dayTasks.length,
      completed: dayTasks.filter(t => t.completed).length,
      completion: dayCompletion,
      remaining: dayTasks.filter(t => !t.completed).length
    },
    week: {
      total: weekTasks.length,
      completed: weekTasks.filter(t => t.completed).length,
      completion: weekCompletion,
      highPriority: weekTasks.filter(t => t.priority === 'high').length,
      remaining: weekTasks.filter(t => !t.completed).length
    },
    month: {
      total: monthTasks.length,
      completed: monthTasks.filter(t => t.completed).length,
      completion: monthCompletion,
      byCategory: monthTasks.reduce((acc: {[key: string]: number}, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1
        return acc
      }, {}),
      byPriority: {
        high: monthTasks.filter(t => t.priority === 'high').length,
        medium: monthTasks.filter(t => t.priority === 'medium').length,
        low: monthTasks.filter(t => t.priority === 'low').length
      },
      remaining: monthTasks.filter(t => !t.completed).length
    }
  }
} 