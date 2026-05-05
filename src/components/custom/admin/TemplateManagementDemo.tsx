'use client'
import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText as FileTemplate, Plus, Settings } from 'lucide-react'
import TemplateManager from './TemplateManager'
import TemplateSelector from './TemplateSelector'
import { type CreateQuizRequest } from '@/lib/stores/admin-awareness-store'

/**
 * Demo component showing the template management interface integration
 * This demonstrates how the TemplateManager and TemplateSelector work together
 */
export default function TemplateManagementDemo() {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedQuizData, setSelectedQuizData] = useState<CreateQuizRequest | null>(null)

  const handleTemplateSelected = (quizData: CreateQuizRequest) => {
    setSelectedQuizData(quizData)
    console.log('Template selected, quiz data:', quizData)
    // In a real implementation, this would navigate to quiz creation with pre-filled data
  }

  const handleSkipTemplate = () => {
    setSelectedQuizData(null)
    console.log('Skipped template selection, creating quiz from scratch')
    // In a real implementation, this would navigate to quiz creation with empty form
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTemplate className="h-5 w-5" />
            Template Management Demo
          </CardTitle>
          <CardDescription>
            Demonstration of the quiz template management interface and template selection workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowTemplateSelector(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Quiz (with Template Selection)
            </Button>
            
            {selectedQuizData && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Settings className="h-4 w-4" />
                Template applied: {selectedQuizData.language === 'ar' ? 'Arabic' : 'English'}, 
                {selectedQuizData.timeLimitMinutes}min, {selectedQuizData.maxAttempts} attempts
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Management Interface */}
      <Tabs defaultValue="manager" className="w-full">
        <TabsList>
          <TabsTrigger value="manager">Template Manager</TabsTrigger>
          <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manager" className="space-y-4">
          <TemplateManager />
        </TabsContent>
        
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Usage Statistics</CardTitle>
              <CardDescription>
                Analytics and insights about template usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileTemplate className="h-12 w-12 mx-auto mb-4 text-muted-foreground/80" />
                <p>Template usage analytics would be displayed here</p>
                <p className="text-sm mt-2">
                  This would show metrics like most used templates, creation trends, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Selector Dialog */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onTemplateSelected={handleTemplateSelected}
        onSkipTemplate={handleSkipTemplate}
      />
    </div>
  )
}