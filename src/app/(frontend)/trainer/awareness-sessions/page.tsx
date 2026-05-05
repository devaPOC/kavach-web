'use client'
import React from 'react'
import TrainerAwarenessSessionDashboard from '@/components/custom/trainer/TrainerAwarenessSessionDashboard'

export default function TrainerAwarenessSessionsPage() {
  return (
    <div className="p-4 lg:p-8">
      {/*
         TrainerAwarenessSessionDashboard already has headers and filters built-in.
         We just render it here directly.
      */}
      <TrainerAwarenessSessionDashboard />
    </div>
  )
}
