'use client'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Link, Video, FileText, ExternalLink } from 'lucide-react'
import { type ModuleMaterial } from '@/lib/stores/awareness-lab-store'

interface MaterialDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: ModuleMaterial | null
  onMaterialDeleted: () => void
}

export default function MaterialDeleteDialog({
  open,
  onOpenChange,
  material,
  onMaterialDeleted
}: MaterialDeleteDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleDelete = async () => {
    if (!material) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/admin/learning-modules/materials/${material.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete material')
      }

      onMaterialDeleted()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete material:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5 text-destructive" />
      case 'link':
        return <Link className="h-5 w-5 text-destructive" />
      case 'document':
        return <FileText className="h-5 w-5 text-destructive" />
      default:
        return <FileText className="h-5 w-5 text-destructive" />
    }
  }

  const getMaterialTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video Content'
      case 'link':
        return 'External Link'
      case 'document':
        return 'Document'
      default:
        return 'Material'
    }
  }

  const getUrlTypeInfo = (url: string) => {
    try {
      const urlObj = new URL(url)

      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        return { type: 'YouTube Video', icon: '📺' }
      }

      if (urlObj.hostname.includes('vimeo.com')) {
        return { type: 'Vimeo Video', icon: '🎬' }
      }

      return { type: 'External Link', icon: '🔗' }
    } catch {
      return { type: 'Invalid URL', icon: '❌' }
    }
  }

  if (!material) return null

  const urlInfo = material.materialData.url ? getUrlTypeInfo(material.materialData.url) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Learning Material
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the material from the module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-start gap-3">
              {getMaterialTypeIcon(material.materialType)}
              <div className="flex-1">
                <h4 className="font-medium text-destructive">{material.title}</h4>
                {material.description && (
                  <p className="text-sm text-destructive mt-1">{material.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-destructive">
                  <span>Type: {getMaterialTypeLabel(material.materialType)}</span>
                  <span>Order: {material.orderIndex}</span>
                </div>
                {material.materialData.url && urlInfo && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <span>{urlInfo.icon}</span>
                      <span className="font-medium">{urlInfo.type}</span>
                    </div>
                    <div className="text-xs text-destructive break-all mt-1">
                      {material.materialData.url}
                    </div>
                  </div>
                )}
                {material.materialData.duration && (
                  <div className="mt-2 text-sm text-destructive">
                    Duration: {material.materialData.duration} minutes
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">What will be deleted:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                Material title and description
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                URL and embed information
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                User progress data for this material
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                Material ordering within the module
              </li>
            </ul>
          </div>

          <div className="bg-accent/10 border border-accent/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-accent mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-accent">Note</h4>
                <p className="text-sm text-accent mt-1">
                  The external content (videos, documents, links) will remain available at their original URLs.
                  Only the reference to this content within the learning module will be removed.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this material?
            </p>
            <p className="font-medium text-foreground mt-1">"{material.title}"</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive"
          >
            {isLoading ? 'Deleting...' : 'Delete Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
