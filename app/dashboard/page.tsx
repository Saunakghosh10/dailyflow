'use client'

import { DailyFlowComponent } from "@/components/daily-flow"
import { useEffect } from 'react'
import '../pwa'

export default function Dashboard() {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        function (registration) {
          console.log('Service Worker registered with scope:', registration.scope);
        },
        function (error) {
          console.log('Service Worker registration failed:', error);
        }
      );
    }
  }, [])

  return <DailyFlowComponent />
} 