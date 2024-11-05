'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, ChevronDown, Layout, List, PlusCircle, Settings, User, BarChart2, Clock, Menu, X, Trash2 } from 'lucide-react'
import { pusherClient } from '@/lib/pusher'
import { startOfToday, isToday, isPast, isFuture, parseISO } from 'date-fns'
import { cn } from "@/lib/utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { groupTasksByDate } from '@/lib/taskUtils'
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { DraggableTask } from './DraggableTask'
import { calculateTaskStats } from '@/lib/statsUtils'
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { ThemeToggle } from "@/components/theme-toggle"

// Add interface for Task type
interface Task {
  id: number
  title: string
  completed: boolean
  category: string
  createdAt: Date
  updatedAt: Date
  userId?: string
  isRecurring: boolean
  recurrence?: string
  dueDate?: Date
  reminder?: Date
  lastCompleted?: Date
  priority: string
}

// Update the calendar icon in the navigation button
const CalendarIcon = () => (
  <svg
    className="mr-2 h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export function DailyFlowComponent() {
  // State management
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [scheduleView, setScheduleView] = useState('day')
  const [dueDate, setDueDate] = useState<Date>()
  const [reminder, setReminder] = useState<Date>()
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrence, setRecurrence] = useState<string>()
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
  const [calendarTasks, setCalendarTasks] = useState<{[key: string]: any[]}>({})
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'upcoming', 'past'
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [taskStats, setTaskStats] = useState<any>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Add DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Calculate stats when tasks or selected date changes
  useEffect(() => {
    if (tasks.length) {
      setTaskStats(calculateTaskStats(tasks, selectedDate))
    }
  }, [tasks, selectedDate])

  // Handle drag end for task rescheduling
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = parseInt(active.id.toString().replace('task-', ''))
    const newDate = new Date(over.id.toString())

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDate })
      })
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, dueDate: newDate } : task
        ))
      }
    } catch (error) {
      console.error('Error rescheduling task:', error)
    }
  }

  // Add priority selection to task creation
  const [priority, setPriority] = useState('medium')

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks')
        if (!response.ok) throw new Error('Failed to fetch tasks')
        const data = await response.json()
        setTasks(data)
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    // Set up real-time updates
    const channel = pusherClient.subscribe('tasks')
    channel.bind('task-added', (newTask: Task) => {
      setTasks(current => [...current, newTask])
    })
    channel.bind('task-updated', (updatedTask: Task) => {
      setTasks(current => current.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ))
    })
    channel.bind('task-deleted', (deletedTask: { id: number }) => {
      setTasks(current => current.filter(task => task.id !== deletedTask.id))
    })

    return () => {
      pusherClient.unsubscribe('tasks')
    }
  }, [])

  // Group tasks by date for calendar view
  useEffect(() => {
    setCalendarTasks(groupTasksByDate(tasks))
  }, [tasks])

  // Task management functions
  const addTask = async () => {
    if (newTask.trim() !== '') {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTask,
            category: selectedCategory === 'all' ? 'Personal' : selectedCategory,
            isRecurring,
            recurrence,
            dueDate,
            reminder,
            priority,
          })
        })
        const task = await response.json()
        setTasks([task, ...tasks])
        setNewTask('')
        // Reset task creation form
        setDueDate(undefined)
        setReminder(undefined)
        setIsRecurring(false)
        setRecurrence(undefined)
      } catch (error) {
        console.error('Error adding task:', error)
      }
    }
  }

  const toggleTask = async (id: number) => {
    try {
      const task = tasks.find(t => t.id === id)
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task?.completed })
      })
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === id ? { ...task, completed: !task.completed } : task
        ))
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const deleteTask = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== id))
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Calculate stats
  const completedTasks = tasks?.filter(task => task.completed)?.length || 0
  const totalTasks = tasks?.length || 0
  const productivityScore = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  // Filter tasks based on category and date
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory
    
    let dateMatch = true
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate)
      switch (dateFilter) {
        case 'today':
          dateMatch = isToday(dueDate)
          break
        case 'upcoming':
          dateMatch = isFuture(dueDate)
          break
        case 'past':
          dateMatch = isPast(dueDate)
          break
      }
    }
    
    return categoryMatch && dateMatch
  })

  // Render different views based on activeView state
  const renderView = () => {
    switch (activeView) {
      case 'tasks':
        return renderTaskList()
      case 'calendar':
        return renderCalendarView()
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderTaskList()}
            {/* Other dashboard components */}
          </div>
        )
    }
  }

  // Add weekly view rendering
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(day => (
          <div key={day.toISOString()} className="min-h-[200px] border rounded-md p-4">
            <h3 className="font-semibold mb-2">{format(day, 'EEE dd')}</h3>
            <div className="space-y-2">
              {tasks
                .filter(task => task.dueDate && isToday(new Date(task.dueDate)))
                .map(task => (
                  <DraggableTask
                    key={task.id}
                    {...task}
                    onToggle={() => toggleTask(task.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Update calendar view to include stats
  const renderCalendarView = () => (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Calendar View</CardTitle>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {viewMode === 'week' ? renderWeekView() : (
              <div className="flex gap-6">
                {/* Existing calendar component */}
                <div className="flex-1">
                  {taskStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Daily Progress</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {taskStats.day.completed}/{taskStats.day.total}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {taskStats.day.completion}% completed today
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Weekly High Priority</CardTitle>
                          <BarChart2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{taskStats.week.highPriority}</div>
                          <p className="text-xs text-muted-foreground">
                            {taskStats.week.completion}% weekly tasks completed
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Monthly Completion</CardTitle>
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{taskStats.month.completion}%</div>
                          <p className="text-xs text-muted-foreground">
                            {taskStats.month.completed} of {taskStats.month.total} tasks completed
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {/* Existing task list */}
                </div>
              </div>
            )}
          </DndContext>
        </CardContent>
      </Card>
    </div>
  )

  // Update the task input form and list section
  const renderTaskList = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>To-Do List</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Category <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('Work')}>Work</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('Personal')}>Personal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Task Input Form */}
          <div className="space-y-4">
            <Input
              placeholder="Add a new task"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
            />
            
            <div className="flex gap-2">
              {/* Due Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon />
                    {dueDate ? format(dueDate, 'PPP') : <span>Due Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    defaultMonth={dueDate}
                  />
                </PopoverContent>
              </Popover>

              {/* Priority Selection */}
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurring Task Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <label htmlFor="recurring">Recurring Task</label>
              </div>

              {isRecurring && (
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button onClick={addTask} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>

          {/* Task List */}
          <ScrollArea className="h-[350px]">
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      className={cn(
                        "flex-1",
                        task.completed && "line-through text-gray-500"
                      )}
                    >
                      {task.title}
                    </label>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      task.priority === 'high' && "bg-red-100 text-red-800",
                      task.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                      task.priority === 'low' && "bg-green-100 text-green-800"
                    )}>
                      {task.priority}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500 ml-6">
                      Due: {format(new Date(task.dueDate), 'PPP')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground">
      {/* Mobile Header */}
      <div className="md:hidden bg-card p-4 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">DailyFlow</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 transform bg-card w-64 transition-transform duration-200 ease-in-out z-30 md:relative md:transform-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4">
          {/* Add theme toggle to desktop sidebar */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Menu</h2>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>

          <div className="space-y-4">
            <Button
              variant={activeView === 'dashboard' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('dashboard')}
            >
              <Layout className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeView === 'calendar' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('calendar')}
            >
              <CalendarIcon />
              Calendar
            </Button>
            <Button
              variant={activeView === 'tasks' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('tasks')}
            >
              <List className="mr-2 h-4 w-4" />
              Tasks
            </Button>
            <Button
              variant={activeView === 'stats' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveView('stats')}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Statistics
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* View Title and Actions */}
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">
                  {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                </h1>
                {activeView === 'calendar' && (
                  <Select 
                    value={viewMode} 
                    onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day View</SelectItem>
                      <SelectItem value="week">Week View</SelectItem>
                      <SelectItem value="month">Month View</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Task Stats - Grid adjusts for mobile */}
              {taskStats && activeView === 'dashboard' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Daily Progress</p>
                      <p className="text-2xl font-bold">{taskStats.day.completed}/{taskStats.day.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Weekly High Priority</p>
                      <p className="text-2xl font-bold">{taskStats.week.highPriority}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Monthly Completion</p>
                      <p className="text-2xl font-bold">
                        {Math.round((taskStats.month.completed / taskStats.month.total) * 100)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Task Input Form - Mobile Optimized */}
              <div className="space-y-4 mb-6">
                <Input
                  placeholder="Add a new task"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  className="w-full"
                />
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                        <CalendarIcon />
                        {dueDate ? format(dueDate, 'PPP') : <span>Due Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        defaultMonth={dueDate}
                      />
                    </PopoverContent>
                  </Popover>

                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recurring Task Options */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                    />
                    <label htmlFor="recurring">Recurring Task</label>
                  </div>

                  {isRecurring && (
                    <Select value={recurrence} onValueChange={setRecurrence}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button onClick={addTask} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>

              {/* Task List - Mobile Optimized */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h2 className="text-lg font-semibold">Tasks</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                          <SelectItem value="Personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ScrollArea className="h-[350px] w-full">
                    <div className="space-y-2">
                      {filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask(task.id)}
                            />
                            <div className="flex flex-col">
                              <span className={cn(
                                "font-medium",
                                task.completed && "line-through text-gray-500"
                              )}>
                                {task.title}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due: {format(new Date(task.dueDate), 'PPP')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              task.priority === 'high' && "bg-red-100 text-red-800",
                              task.priority === 'medium' && "bg-yellow-100 text-yellow-800",
                              task.priority === 'low' && "bg-green-100 text-green-800"
                            )}>
                              {task.priority}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}