"use client"
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminTilesSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			{[...Array(4)].map((_, i) => (
				<div key={i} className="p-4 rounded-lg border">
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-24" />
					</div>
					<Skeleton className="h-7 w-16 mt-3" />
				</div>
			))}
		</div>
	)
}

export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
	return (
		<div className="border rounded-lg overflow-hidden">
			<div className="bg-muted/40 h-10" />
			<div className="divide-y">
				{[...Array(rows)].map((_, i) => (
					<div key={i} className="grid grid-cols-12 items-center px-4 py-4">
						<Skeleton className="col-span-4 h-4" />
						<Skeleton className="col-span-2 h-4" />
						<Skeleton className="col-span-2 h-4" />
						<Skeleton className="col-span-2 h-4" />
						<Skeleton className="col-span-2 h-8 justify-self-end w-24" />
					</div>
				))}
			</div>
		</div>
	)
}

export default function AdminLoadingSkeleton() {
	return (
		<div className="space-y-4">
			<AdminTilesSkeleton />
			<AdminTableSkeleton />
		</div>
	)
}
