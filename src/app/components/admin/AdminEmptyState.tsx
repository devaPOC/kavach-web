"use client"
import React from 'react'

interface AdminEmptyStateProps {
	icon?: React.ComponentType<{ className?: string }>
	title: string
	description?: string
	action?: React.ReactNode
}

export function AdminEmptyState({ icon: Icon, title, description, action }: AdminEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-card">
			{Icon ? <Icon className="h-10 w-10 text-muted-foreground mb-3" /> : null}
			<h3 className="text-lg font-medium">{title}</h3>
			{description ? (
				<p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
			) : null}
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	)
}

export default AdminEmptyState
