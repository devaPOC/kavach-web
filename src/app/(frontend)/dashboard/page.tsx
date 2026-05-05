'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Card, CardContent, Dialog, DialogContent, DialogTrigger } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { dummyServices } from './data'
import { DefaultService, FixMyLaptopOrSmartphoneAndMakeMyDeviceRunFaster, RemoveMyInformationFromTheInternet, ResetMyHackedPassword, ScanMySocialMediaForPrivacyRisks, EmergencyCybersecurityIncident, IClickedOnPhishingLink, RemoveMalwareFromMyComputer, RecoverMyLostData, SetUpParentalControls, HomeSecurityAssessment, GeneralConsultation, CybersecurityAwarenessTraining } from './forms/formRender'
import { CybersecurityBodyguard } from '@/components/services'
import CustomerServiceRequests from '@/components/custom/customer/CustomerServiceRequests'

import { CustomerAwarenessSessionManager } from '@/components/custom/customer'
import { AwarenessLabTab } from '@/components/custom/awareness-lab'
import { LanguageProvider } from '@/lib/contexts/LanguageContext'


function DashboardContent() {
  const router = useRouter()
  // Moved useSearchParams before any conditional returns to keep hook order stable
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({})
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const handleOpenDialog = (serviceId: string) => {
    setOpenDialogs(prev => ({ ...prev, [serviceId]: true }))
  }

  const handleCloseDialog = (serviceId: string) => {
    setOpenDialogs(prev => ({ ...prev, [serviceId]: false }))
  }

  useEffect(() => {
    let cancelled = false
    const fetchUser = async () => {
      try {
        // Use the new V1 API client
        const result = await authApi.me()
        if (!cancelled) {
          if (result.success && result.data) {
            const userData = result.data

            // Check if expert is approved
            if (userData.role === 'expert' && !userData.isApproved) {
              // Redirect unapproved experts to pending approval page
              router.push('/pending-approval')
              return
            }

            // Redirect approved experts to expert dashboard
            if (userData.role === 'expert' && userData.isApproved) {
              router.push('/expert/dashboard')
              return
            }

            setUser(userData)
          } else {
            setError('Failed to fetch user data')
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('Error fetching user:', e)
          setError(e.message || 'Failed to load user data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUser()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600"></div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error || 'Failed to load user data'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const serviceForms: Record<string, React.FC<any>> = {
    'Scan My Social Media for Privacy Risks': ScanMySocialMediaForPrivacyRisks,
    'Remove My Information from the Internet': RemoveMyInformationFromTheInternet,
    'Fix My Laptop or Smartphone and Make My Devices Run Faster': FixMyLaptopOrSmartphoneAndMakeMyDeviceRunFaster,
    'Reset My Hacked Password': ResetMyHackedPassword,
    'Emergency Cybersecurity Incident': EmergencyCybersecurityIncident,
    'I Clicked on a Phishing Link': IClickedOnPhishingLink,
    'Remove Malware from My Computer': RemoveMalwareFromMyComputer,
    'Recover My Lost Data': RecoverMyLostData,
    'Set Up Parental Controls': SetUpParentalControls,
    'Home Security Assessment': HomeSecurityAssessment,
    'General Consultation': GeneralConsultation,
    'Cybersecurity Bodyguard': CybersecurityBodyguard,
    'Cybersecurity Awareness Training': CybersecurityAwarenessTraining
  }

  const renderFormComponent = (service: any) => {
    const FormComponent = serviceForms[service.service] || DefaultService
    return React.createElement(FormComponent, {
      onClose: () => handleCloseDialog(service.id.toString()),
      serviceType: service.service // Pass service type for pricing lookup
    })
  }

  const filterServicesByCategory = (category: string) => {
    if (category === 'all') return dummyServices
    return dummyServices.filter(service => service.category === category)
  }

  const renderServiceCards = (services: any[]) => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-6'>
      {services.map((service) => (
        <div
          key={service.id}
          className='relative bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col min-h-[280px] shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 ease-out group overflow-hidden'
        >
          {/* Content wrapper */}
          <div className='flex flex-col h-full'>

            {/* Header */}
            <div className='mb-4'>
              <span className='inline-block px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-300'>
                {service.category}
              </span>
              <h3 className='font-semibold text-slate-800 text-base leading-snug group-hover:text-slate-900 transition-colors duration-300'>
                {service.service}
              </h3>
            </div>

            {/* Description */}
            <ul className='text-sm text-slate-500 space-y-2 flex-1 group-hover:text-slate-600 transition-colors duration-300'>
              {Object.values(service.description || {}).slice(0, 3).map((d, i) => (
                <li key={i} className='flex items-start gap-2.5'>
                  <span className='w-1 h-1 rounded-full bg-slate-300 group-hover:bg-indigo-400 mt-2 flex-shrink-0 transition-colors duration-300'></span>
                  <span className='line-clamp-2'>{String(d)}</span>
                </li>
              ))}
            </ul>

            {/* Action Button */}
            <Dialog
              open={openDialogs[service.id.toString()] || false}
              onOpenChange={(open) => {
                if (open) {
                  handleOpenDialog(service.id.toString())
                } else {
                  handleCloseDialog(service.id.toString())
                }
              }}
            >
              <DialogTrigger asChild>
                <button className='mt-5 w-full py-2.5 px-4 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-600 bg-transparent hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200'>
                  Request Service
                </button>
              </DialogTrigger>

              <DialogContent>
                {renderFormComponent(service)}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
    </div>
  )

  // No more view switching logic here. This page is now ONLY the Service Catalog.

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Request Service</h1>
        <p className="text-slate-500 text-sm">
          Browse our services and request assistance from our experts.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="category-filter" className="text-sm font-medium text-slate-600">Filter by category</label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
        >
          <option value="all">All Services</option>
          <option value="personal">Personal Protection</option>
          <option value="emergency-response">Emergency Response</option>
          <option value="personal-and-family-safety">Personal &amp; Family Safety</option>
        </select>
      </div>

      {/* Service Cards */}
      {renderServiceCards(filterServicesByCategory(categoryFilter))}
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
