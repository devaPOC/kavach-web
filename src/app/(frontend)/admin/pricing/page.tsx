'use client'
import React from 'react'
import ServicePricingManagement from '@/components/custom/admin/ServicePricingManagement'

export default function AdminPricingPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Service Pricing</h1>
        <p className="text-muted-foreground">
          Configure service pricing and rates
        </p>
      </div>

      <ServicePricingManagement />
    </div>
  )
}