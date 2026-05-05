'use client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdminAwarenessStore, type CreateModuleRequest } from '@/lib/stores/admin-awareness-store'
import { TargetAudienceSelect } from '../awareness-lab/TargetAudienceSelect'

interface ModuleCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onModuleCreated: () => void
}

export default function ModuleCreateDialog({
  open,
  onOpenChange,
  onModuleCreated
}: ModuleCreateDialogProps) {
  const { adminModules, isLoading, actions: { createModule } } = useAdminAwarenessStore()

  const [formData, setFormData] = useState<CreateModuleRequest>({
    title: '',
    description: '',
    category: '',
    targetAudience: 'customer',
    orderIndex: adminModules.length + 1
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const result = await createModule(formData)
      if (result) {
        onModuleCreated()
        handleClose()
      }
    } catch (error) {
      console.error('Failed to create module:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      targetAudience: 'customer',
      orderIndex: adminModules.length + 1
    })
    setErrors({})
    onOpenChange(false)
  }

  const handleInputChange = (field: keyof CreateModuleRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Get existing categories for suggestions
  const existingCategories = Array.from(new Set(adminModules.map(m => m.category))).sort()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Learning Module</DialogTitle>
          <DialogDescription>
            Create a new learning module to organize educational content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter module title"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter module description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <div className="space-y-2">
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Enter category name"
                className={errors.category ? 'border-destructive' : ''}
              />
              {existingCategories.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Existing categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingCategories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleInputChange('category', category)}
                        className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded border"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <TargetAudienceSelect
            value={formData.targetAudience}
            onChange={(value) => handleInputChange('targetAudience', value)}
          />

          <div className="space-y-2">
            <Label htmlFor="orderIndex">Display Order</Label>
            <Input
              id="orderIndex"
              type="number"
              min="1"
              value={formData.orderIndex}
              onChange={(e) => handleInputChange('orderIndex', parseInt(e.target.value) || 1)}
              placeholder="Display order"
            />
            <p className="text-sm text-muted-foreground">
              Lower numbers appear first. Current modules: {adminModules.length}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
