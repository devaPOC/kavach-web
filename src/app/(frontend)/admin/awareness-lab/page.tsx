'use client'
import React from 'react'
import AdminAwarenessLab from '@/components/custom/admin/AdminAwarenessLab'

export default function AdminAwarenessLabPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Awareness Lab</h1>
        <p className="text-muted-foreground">
          Manage learning materials and quizzes
        </p>
      </div>

      <AdminAwarenessLab />
    </div>
  )
}