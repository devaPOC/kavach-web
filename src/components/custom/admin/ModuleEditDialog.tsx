'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdminAwarenessStore, type UpdateModuleRequest } from '@/lib/stores/admin-awareness-store'
import { type LearningModule } from '@/lib/stores/awareness-lab-store'

interface ModuleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: LearningModule | null
  onModuleUpdated: () => void
}

export default function ModuleEditDialog({
  open,
  onOpenChange,
  module,
  onModuleUpdated
}: ModuleEditDialogProps) {
  const { adminModules, isLoading, actions: { updateModule } } = useAdminAwarenessStore()
  
  const [formData, setFormData] = useState<UpdateModuleRequest>({
    title: '',
    description: '',
    category: '',
    orderIndex: 1
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (module && open) {
      setFormData({
        title: module.title,
        description: module.description || '',
        category: module.category,
        orderIndex: module.orderIndex
      })
      setErrors({})
    }
  }, [module, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!module) return

    // Validate form
    const newErrors: Record<string, string> = {}
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const result = await updateModule(module.id, formData)
      if (result) {
        onModuleUpdated()
        handleClose()
      }
    } catch (error) {
      console.error('Failed to update module:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      orderIndex: 1
    })
    setErrors({})
    onOpenChange(false)
  }

  const handleInputChange = (field: keyof UpdateModuleRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Get existing categories for suggestions (excluding current module's category)
  const existingCategories = Array.from(new Set(
    adminModules
      .filter(m => m.id !== module?.id)
      .map(m => m.category)
  )).sort()

  if (!module) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Learning Module</DialogTitle>
          <DialogDescription>
            Update the module information and settings.
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
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
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
                className={errors.category ? 'border-red-500' : ''}
              />
              {existingCategories.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Other categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingCategories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleInputChange('category', category)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>

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
            <p className="text-sm text-gray-500">
              Lower numbers appear first. Total modules: {adminModules.length}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Materials:</span>
                <span className="font-medium">{module.materials.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${module.isPublished ? 'text-green-600' : 'text-gray-600'}`}>
                  {module.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(module.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
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
              {isLoading ? 'Updating...' : 'Update Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}