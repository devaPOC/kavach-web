'use client'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CheckCircle, AlertCircle, Briefcase } from 'lucide-react'
import { AssignedTasks, CompletedTasks, PendingClosureTasks } from '@/components/custom/expert'

export default function ExpertTasksPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
						<Briefcase className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">Tasks & Projects</h1>
						<p className="text-muted-foreground text-sm">Manage your assigned tasks and track project progress</p>
					</div>
				</div>
			</div>

			<Tabs defaultValue="active" className="space-y-6">
				<TabsList className="bg-muted/80 p-1 rounded-xl">
					<TabsTrigger
						value="active"
						className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary px-4 py-2"
					>
						<Clock className="h-4 w-4" />
						<span>Active Tasks</span>
					</TabsTrigger>
					<TabsTrigger
						value="completed"
						className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-secondary px-4 py-2"
					>
						<CheckCircle className="h-4 w-4" />
						<span>Completed</span>
					</TabsTrigger>
					<TabsTrigger
						value="pending"
						className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-accent px-4 py-2"
					>
						<AlertCircle className="h-4 w-4" />
						<span>Pending Closure</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="active" className="space-y-6">
					<AssignedTasks />
				</TabsContent>

				<TabsContent value="completed" className="space-y-6">
					<CompletedTasks />
				</TabsContent>

				<TabsContent value="pending" className="space-y-6">
					<PendingClosureTasks />
				</TabsContent>
			</Tabs>
		</div>
	)
}
