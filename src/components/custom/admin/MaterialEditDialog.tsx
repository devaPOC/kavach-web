'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Link, Video, FileText, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { type ModuleMaterial } from '@/lib/stores/awareness-lab-store'

interface MaterialEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: ModuleMaterial | null
  onMaterialUpdated: () => void
}

interface MaterialFormData {
  title: string
  description: string
  materialType: 'link' | 'video' | 'document'
  url: string
  duration?: number
}

interface UrlValidation {
  isValid: boolean
  type: 'youtube' | 'vimeo' | 'link' | 'unknown'
  embedUrl?: string
  videoId?: string
  error?: string
}

export default function MaterialEditDialog({
  open,
  onOpenChange,
  material,
  onMaterialUpdated
}: MaterialEditDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>({
    title: '',
    description: '',
    materialType: 'link',
    url: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [urlValidation, setUrlValidation] = useState<UrlValidation | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (material && open) {
      setFormData({
        title: material.title,
        description: material.description || '',
        materialType: material.materialType,
        url: material.materialData.url || '',
        duration: material.materialData.duration
      })
      setErrors({})
    }
  }, [material, open])

  useEffect(() => {
    if (formData.url) {
      validateUrl(formData.url)
    } else {
      setUrlValidation(null)
    }
  }, [formData.url])

  const validateUrl = (url: string): void => {
    try {
      const urlObj = new URL(url)

      // YouTube validation
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = ''

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1)
        } else if (urlObj.searchParams.has('v')) {
          videoId = urlObj.searchParams.get('v') || ''
        }

        if (videoId) {
          setUrlValidation({
            isValid: true,
            type: 'youtube',
            videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}`
          })
          return
        }
      }

      // Vimeo validation
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop()
        if (videoId && /^\d+$/.test(videoId)) {
          setUrlValidation({
            isValid: true,
            type: 'vimeo',
            videoId,
            embedUrl: `https://player.vimeo.com/video/${videoId}`
          })
          return
        }
      }

      // General link validation
      setUrlValidation({
        isValid: true,
        type: 'link'
      })
    } catch {
      setUrlValidation({
        isValid: false,
        type: 'unknown',
        error: 'Invalid URL format'
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!material) return

    // Validate form
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else if (!urlValidation?.isValid) {
      newErrors.url = urlValidation?.error || 'Invalid URL'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      const materialData: any = {
        url: formData.url
      }

      if (urlValidation?.embedUrl) {
        materialData.embedCode = urlValidation.embedUrl
      }

      if (formData.duration && formData.duration > 0) {
        materialData.duration = formData.duration
      }

      console.log('Edit Material - Duration value:', formData.duration);
      console.log('Edit Material - Full materialData:', materialData);
      console.log('Edit Material - Full request body:', {
        title: formData.title,
        description: formData.description,
        materialType: formData.materialType,
        materialData
      });

      const response = await fetch(`/api/v1/admin/learning-modules/materials/${material.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          materialType: formData.materialType,
          materialData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update material')
      }

      onMaterialUpdated()
      handleClose()
    } catch (error) {
      console.error('Failed to update material:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update material' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      materialType: 'link',
      url: ''
    })
    setErrors({})
    setUrlValidation(null)
    onOpenChange(false)
  }

  const handleInputChange = (field: keyof MaterialFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'link':
        return <Link className="h-4 w-4" />
      case 'document':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Learning Material</DialogTitle>
          <DialogDescription>
            Update the material information and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="materialType">Material Type *</Label>
            <Select
              value={formData.materialType}
              onValueChange={(value: 'link' | 'video' | 'document') => handleInputChange('materialType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    External Link
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Content
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter material title"
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
              placeholder="Enter material description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <div className="space-y-2">
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder={
                  formData.materialType === 'video'
                    ? 'Enter YouTube or Vimeo URL'
                    : 'Enter URL'
                }
                className={errors.url ? 'border-red-500' : ''}
              />

              {/* URL Validation Feedback */}
              {urlValidation && (
                <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${urlValidation.isValid
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                  {urlValidation.isValid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>
                    {urlValidation.isValid ? (
                      <>
                        Valid {urlValidation.type === 'youtube' ? 'YouTube' :
                          urlValidation.type === 'vimeo' ? 'Vimeo' : 'URL'}
                        {urlValidation.type !== 'link' && ' video detected'}
                      </>
                    ) : (
                      urlValidation.error || 'Invalid URL'
                    )}
                  </span>
                  {urlValidation.isValid && urlValidation.type !== 'link' && (
                    <Badge variant="outline" className="ml-auto">
                      Embeddable
                    </Badge>
                  )}
                </div>
              )}

              {errors.url && (
                <p className="text-sm text-red-600">{errors.url}</p>
              )}
            </div>
          </div>

          {formData.materialType === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                value={formData.duration || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  handleInputChange('duration', isNaN(value) || value <= 0 ? undefined : value)
                }}
                placeholder="Optional video duration"
              />
              <p className="text-sm text-gray-500">
                Optional: Specify video duration for better user experience
              </p>
            </div>
          )}

          {/* Current Material Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Material Info</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Order Index:</span>
                <span>{material.orderIndex}</span>
              </div>
              <div className="flex justify-between">
                <span>Original Type:</span>
                <span className="capitalize">{material.materialType}</span>
              </div>
              {material.materialData.duration && (
                <div className="flex justify-between">
                  <span>Current Duration:</span>
                  <span>{material.materialData.duration} minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          {urlValidation?.isValid && formData.url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Updated Preview
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getMaterialTypeIcon(formData.materialType)}
                  <span className="font-medium">{formData.title || 'Untitled Material'}</span>
                  <Badge variant="outline">{formData.materialType}</Badge>
                </div>
                {formData.description && (
                  <p className="text-sm text-blue-700">{formData.description}</p>
                )}
                <div className="text-sm text-blue-600 break-all">
                  {formData.url}
                </div>
                {urlValidation.type === 'youtube' && (
                  <p className="text-xs text-blue-600">
                    📺 YouTube video detected - will open in new tab
                  </p>
                )}
                {urlValidation.type === 'vimeo' && (
                  <p className="text-xs text-blue-600">
                    🎬 Vimeo video detected - will open in new tab
                  </p>
                )}
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

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
              disabled={isLoading || !urlValidation?.isValid}
            >
              {isLoading ? 'Updating...' : 'Update Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
