"use client"
import React from 'react'

interface AdminDashboardLayoutProps {
	title: string
	description?: string
	actions?: React.ReactNode
	filters?: React.ReactNode
	children: React.ReactNode
}

export function AdminDashboardLayout({ title, description, actions, filters, children }: AdminDashboardLayoutProps) {
	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
					{description ? (
						<p className="text-sm text-muted-foreground mt-1">{description}</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex items-center gap-2">{actions}</div>
				) : null}
			</div>

			{/* Sticky Filters */}
			{filters ? (
				<div className="sticky top-16 z-10 -mx-4 px-4 md:mx-0 md:px-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
					<div className="py-3">
						{filters}
					</div>
				</div>
			) : null}

			{/* Content */}
			<div className="space-y-4">
				{children}
			</div>
		</div>
	)
}

export default AdminDashboardLayout
