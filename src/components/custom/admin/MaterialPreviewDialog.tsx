'use client'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link, Video, FileText, ExternalLink, Play, Clock, Eye } from 'lucide-react'
import { type ModuleMaterial } from '@/lib/stores/awareness-lab-store'

interface MaterialPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: ModuleMaterial | null
}

export default function MaterialPreviewDialog({
  open,
  onOpenChange,
  material
}: MaterialPreviewDialogProps) {
  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />
      case 'link':
        return <Link className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getMaterialTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'link':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'document':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUrlTypeInfo = (url: string) => {
    try {
      const urlObj = new URL(url)

      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = ''

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1)
        } else if (urlObj.searchParams.has('v')) {
          videoId = urlObj.searchParams.get('v') || ''
        }

        return {
          type: 'YouTube Video',
          icon: '📺',
          embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
          canEmbed: !!videoId
        }
      }

      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop()
        const canEmbed = videoId && /^\d+$/.test(videoId)

        return {
          type: 'Vimeo Video',
          icon: '🎬',
          embedUrl: canEmbed ? `https://player.vimeo.com/video/${videoId}` : null,
          canEmbed
        }
      }

      return {
        type: 'External Link',
        icon: '🔗',
        embedUrl: null,
        canEmbed: false
      }
    } catch {
      return {
        type: 'Invalid URL',
        icon: '❌',
        embedUrl: null,
        canEmbed: false
      }
    }
  }

  const handleOpenExternal = () => {
    if (material?.materialData.url) {
      window.open(material.materialData.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!material) return null

  const urlInfo = material.materialData.url ? getUrlTypeInfo(material.materialData.url) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Material Preview
          </DialogTitle>
          <DialogDescription>
            Preview how this material will appear to learners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Material Header */}
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2">
              {getMaterialTypeIcon(material.materialType)}
              <Badge className={getMaterialTypeBadgeColor(material.materialType)}>
                {material.materialType}
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{material.title}</h3>
              {material.description && (
                <p className="text-gray-600 mt-1">{material.description}</p>
              )}
            </div>
          </div>

          {/* Material Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <p className="text-sm text-gray-900 capitalize">{material.materialType}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Order:</span>
              <p className="text-sm text-gray-900">{material.orderIndex}</p>
            </div>
            {material.materialData.duration && (
              <div>
                <span className="text-sm font-medium text-gray-700">Duration:</span>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {material.materialData.duration} minutes
                </p>
              </div>
            )}
            {urlInfo && (
              <div>
                <span className="text-sm font-medium text-gray-700">Content Type:</span>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <span>{urlInfo.icon}</span>
                  {urlInfo.type}
                </p>
              </div>
            )}
          </div>

          {/* URL Information */}
          {material.materialData.url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Content URL</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in New Tab
                </Button>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 break-all">{material.materialData.url}</p>
              </div>
            </div>
          )}

          {/* Content Preview */}
          {material.materialData.url && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">Content Preview</h4>
                {urlInfo && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    <span className="mr-1">{urlInfo.icon}</span>
                    {urlInfo.type}
                  </Badge>
                )}
              </div>
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <ExternalLink className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium mb-1">External Content</p>
                    <p className="text-sm text-gray-600">
                      This content will open in a new tab when clicked by learners.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2"
                  >
                    {material.materialType === 'video' && <Play className="h-3 w-3" />}
                    <span>
                      {material.materialType === 'video' ? 'Watch Video' : 'Open Content'}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <div className="mt-2 text-xs text-gray-500 break-all max-w-full">
                    {material.materialData.url}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Learner Experience Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Learner Experience</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                Learners will see this material in the "{material.materialType}" section
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                Progress will be tracked when they interact with this content
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                Content will open in a new tab for security and compatibility
              </li>
              {material.materialData.duration && (
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  Estimated completion time: {material.materialData.duration} minutes
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleOpenExternal}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Original
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
