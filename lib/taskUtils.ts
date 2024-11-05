import { addDays, addWeeks, addMonths } from 'date-fns'

export function getNextDueDate(recurrence: string, currentDueDate: Date): Date {
  switch (recurrence) {
    case 'daily':
      return addDays(currentDueDate, 1)
    case 'weekly':
      return addWeeks(currentDueDate, 1)
    case 'monthly':
      return addMonths(currentDueDate, 1)
    default:
      return currentDueDate
  }
}

export function groupTasksByDate(tasks: any[]) {
  return tasks.reduce((groups: { [key: string]: any[] }, task) => {
    if (task.dueDate) {
      const date = new Date(task.dueDate).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(task)
    }
    return groups
  }, {})
} 