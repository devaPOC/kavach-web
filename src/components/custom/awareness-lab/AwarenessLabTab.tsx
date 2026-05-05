'use client'

import React, { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { BookOpen, Brain, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useAwarenessLabStore, useAwarenessLabActions, useAwarenessLabLoading, useAwarenessLabError } from '@/lib/stores/awareness-lab-store'
import { useLanguage } from '@/lib/contexts/LanguageContext'
import { getLanguageClasses } from '@/lib/utils/language'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { AwarenessHub } from './AwarenessHub'
import { AwarenessLab } from './AwarenessLab'

interface ProgressIndicatorProps {
  completed: number
  total: number
  type: 'quizzes' | 'modules'
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ completed, total, type }) => {
  const { language } = useLanguage()
  const languageClasses = getLanguageClasses(language)
  const isArabic = language === 'ar'

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const icon = type === 'quizzes' ? Brain : BookOpen
  const Icon = icon

  const getTypeLabel = () => {
    if (isArabic) {
      return type === 'quizzes' ? 'تقدم الاختبارات' : 'تقدم الوحدات'
    }
    return `${type} Progress`
  }

  const getCompletionText = () => {
    if (isArabic) {
      return `${percentage}% مكتمل`
    }
    return `${percentage}% Complete`
  }

  return (
    <div className={`flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className="flex-shrink-0">
        <Icon className="h-8 w-8 text-blue-600" />
      </div>
      <div className="flex-1">
        <div className={`flex items-center justify-between mb-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
          <span className={`text-sm font-medium text-gray-900 capitalize ${languageClasses}`}>
            {getTypeLabel()}
          </span>
          <span className="text-sm text-gray-600">
            {completed}/{total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs text-gray-500 mt-1 ${languageClasses}`}>
          {getCompletionText()}
        </span>
      </div>
    </div>
  )
}





export const AwarenessLabTab: React.FC = () => {
  const { language, direction } = useLanguage()
  const languageClasses = getLanguageClasses(language)
  const isArabic = language === 'ar'

  // Get current user information for role-based functionality
  const { user, isLoading: userLoading, error: userError } = useCurrentUser()

  const {
    quizzes,
    learningModules,
    userQuizAttempts,
    userProgress,
    activeTab
  } = useAwarenessLabStore()

  const {
    fetchQuizzes,
    fetchLearningModules,
    setActiveTab,
    clearError
  } = useAwarenessLabActions()

  const isLoading = useAwarenessLabLoading()
  const error = useAwarenessLabError()

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchQuizzes(),
        fetchLearningModules()
      ])
    }
    loadData()
  }, [fetchQuizzes, fetchLearningModules])

  // Calculate progress statistics
  const completedQuizzes = Array.isArray(quizzes) ? quizzes.filter(quiz => {
    const attempts = userQuizAttempts[quiz.id] || []
    const completedAttempts = attempts.filter(attempt => attempt.isCompleted)
    return completedAttempts.some(attempt => attempt.score >= 70) // 70% passing score
  }).length : 0

  const completedModules = Array.isArray(learningModules) ? learningModules.filter(module => {
    const totalMaterials = module.materials?.length || 0
    if (totalMaterials === 0) return false

    // Count completed materials for this module
    const completedMaterials = module.materials?.filter((material: any) => {
      const progressKey = `${module.id}-${material.id}`
      return userProgress[progressKey]?.isCompleted
    }).length || 0

    return completedMaterials === totalMaterials
  }).length : 0

  // Role-based feature availability
  const isExpert = user?.role === 'expert'
  const isCustomer = user?.role === 'customer'
  const isAdmin = user?.role === 'admin'

  // Determine available features based on role
  const canAccessAdvancedAnalytics = isExpert || isAdmin
  const canViewAllQuizzes = true // Both customers and experts can view all quizzes
  const canViewAllModules = true // Both customers and experts can view all modules

  // Role-specific welcome message
  const getWelcomeMessage = () => {
    if (isArabic) {
      if (isExpert) {
        return 'مرحباً بك في مختبر التوعية - واجهة موحدة للخبراء والعملاء'
      } else if (isCustomer) {
        return 'مرحباً بك في مختبر التوعية - تعلم وطور مهاراتك في الأمن السيبراني'
      }
      return 'مرحباً بك في مختبر التوعية'
    } else {
      if (isExpert) {
        return 'Welcome to Awareness Lab - Unified interface for experts and customers'
      } else if (isCustomer) {
        return 'Welcome to Awareness Lab - Learn and develop your cybersecurity skills'
      }
      return 'Welcome to Awareness Lab'
    }
  }





  // Show user loading state
  if (userLoading) {
    return (
      <div className="space-y-4" dir={direction}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className={`ml-3 text-gray-600 ${languageClasses} ${isArabic ? 'mr-3 ml-0' : ''}`}>
            {isArabic ? 'جاري تحميل معلومات المستخدم...' : 'Loading user information...'}
          </span>
        </div>
      </div>
    )
  }

  // Show user error
  if (userError) {
    return (
      <div className="space-y-4" dir={direction}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={languageClasses}>
            {isArabic ? 'فشل في تحميل معلومات المستخدم: ' : 'Failed to load user information: '}{userError}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show awareness lab error
  if (error) {
    return (
      <div className="space-y-4" dir={direction}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={languageClasses}>
            {error}
            <button
              onClick={clearError}
              className={`ml-2 underline hover:no-underline ${isArabic ? 'mr-2 ml-0' : ''}`}
            >
              {isArabic ? 'إخفاء' : 'Dismiss'}
            </button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={direction}>
      {/* Role-based Welcome Message */}
      {user && (
        <div className={`bg-gradient-to-r ${isExpert ? 'from-purple-50 to-indigo-50 border-purple-200' : 'from-blue-50 to-cyan-50 border-blue-200'} border rounded-lg p-4`}>
          <div className={`flex items-center justify-between ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center space-x-3 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`p-2 rounded-full ${isExpert ? 'bg-purple-100' : 'bg-blue-100'}`}>
                {isExpert ? (
                  <Brain className={`h-5 w-5 ${isExpert ? 'text-purple-600' : 'text-blue-600'}`} />
                ) : (
                  <BookOpen className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium text-gray-900 ${languageClasses}`}>
                  {isArabic ? `مرحباً ${user.firstName}` : `Welcome, ${user.firstName}`}
                </p>
                <p className={`text-xs text-gray-600 ${languageClasses}`}>
                  {getWelcomeMessage()}
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`${isExpert ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-blue-300 text-blue-700 bg-blue-50'} ${languageClasses}`}
            >
              {isArabic ? (
                isExpert ? 'خبير' : isCustomer ? 'عميل' : 'مدير'
              ) : (
                user.role.charAt(0).toUpperCase() + user.role.slice(1)
              )}
            </Badge>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressIndicator
          completed={completedQuizzes}
          total={Array.isArray(quizzes) ? quizzes.length : 0}
          type="quizzes"
        />
        <ProgressIndicator
          completed={completedModules}
          total={Array.isArray(learningModules) ? learningModules.length : 0}
          type="modules"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'hub' | 'lab')}
        className="w-full"
      >
        <TabsList className={`grid w-full grid-cols-2 ${languageClasses}`}>
          <TabsTrigger value="hub" className={`flex items-center space-x-2 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <BookOpen className="h-4 w-4" />
            <span>{isArabic ? 'مركز التوعية' : 'Awareness Hub'}</span>
          </TabsTrigger>
          <TabsTrigger value="lab" className={`flex items-center space-x-2 ${isArabic ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <Brain className="h-4 w-4" />
            <span>{isArabic ? 'مختبر التوعية' : 'Awareness Lab'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hub" className="mt-6">
          <AwarenessHub user={user} />
        </TabsContent>

        <TabsContent value="lab" className="mt-6">
          <AwarenessLab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AwarenessLabTab
