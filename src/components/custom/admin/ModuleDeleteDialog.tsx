'use client'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, BookOpen, FileText } from 'lucide-react'
import { useAdminAwarenessStore } from '@/lib/stores/admin-awareness-store'
import { type LearningModule } from '@/lib/stores/awareness-lab-store'

interface ModuleDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: LearningModule | null
  onModuleDeleted: () => void
}

export default function ModuleDeleteDialog({
  open,
  onOpenChange,
  module,
  onModuleDeleted
}: ModuleDeleteDialogProps) {
  const { isLoading, actions: { deleteModule } } = useAdminAwarenessStore()

  const handleDelete = async () => {
    if (!module) return

    try {
      const success = await deleteModule(module.id)
      if (success) {
        onModuleDeleted()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to delete module:', error)
    }
  }

  if (!module) return null

  const hasContent = module.materials.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Learning Module
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the module and all its content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-destructive">{module.title}</h4>
                {module.description && (
                  <p className="text-sm text-destructive mt-1">{module.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-destructive">
                  <span>Category: {module.category}</span>
                  <span>Status: {module.isPublished ? 'Published' : 'Draft'}</span>
                </div>
              </div>
            </div>
          </div>

          {hasContent && (
            <div className="bg-accent/10 border border-accent/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-accent">Content Warning</h4>
                  <p className="text-sm text-accent mt-1">
                    This module contains <strong>{module.materials.length}</strong> learning materials that will also be permanently deleted:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {module.materials.slice(0, 3).map((material) => (
                      <li key={material.id} className="text-sm text-accent flex items-center gap-2">
                        <span className="w-1 h-1 bg-accent rounded-full"></span>
                        {material.title} ({material.materialType})
                      </li>
                    ))}
                    {module.materials.length > 3 && (
                      <li className="text-sm text-accent flex items-center gap-2">
                        <span className="w-1 h-1 bg-accent rounded-full"></span>
                        ... and {module.materials.length - 3} more materials
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">What will be deleted:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                Module information and settings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                All {module.materials.length} learning materials
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                User progress data for this module
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted/80 rounded-full"></span>
                Module categorization and ordering
              </li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Type the module title to confirm deletion:
            </p>
            <p className="font-medium text-foreground mt-1">"{module.title}"</p>
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
            {isLoading ? 'Deleting...' : 'Delete Module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}