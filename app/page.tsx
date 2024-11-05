'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          DailyFlow
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-2xl">
          Streamline your daily tasks with our intuitive task management platform
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              if ('beforeinstallprompt' in window) {
                // @ts-ignore
                window.deferredPrompt?.prompt();
              }
            }}
          >
            Install App
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <FeatureCard
            title="Real-time Updates"
            description="Stay synchronized with instant task updates across all devices"
          />
          <FeatureCard
            title="Smart Organization"
            description="Categorize and prioritize tasks efficiently"
          />
          <FeatureCard
            title="Progress Tracking"
            description="Monitor your productivity with detailed statistics"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
