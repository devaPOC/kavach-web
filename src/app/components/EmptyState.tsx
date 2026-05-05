"use client";
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, RefreshCw } from "lucide-react";

interface EmptyStateProps {
	title: string;
	message?: string;
	onRefresh?: () => void;
	icon?: LucideIcon;
	actionLabel?: string;
	actionHandler?: () => void;
	className?: string;
}

// Minimal reusable empty-state presentation used when a dataset has zero items.
// Guidelines: Keep only essential messaging and a refresh button. Optional action for first-item creation.
export default function EmptyState({
	title,
	message,
	onRefresh,
	icon: Icon,
	actionLabel,
	actionHandler,
	className
}: EmptyStateProps) {
	return (
		<Card className={className}>
			<CardContent className="pt-8 pb-10 flex flex-col items-center text-center">
				<div className="mb-4">
					{Icon ? (
						<Icon className="h-12 w-12 text-muted-foreground/60" />
					) : (
						<RefreshCw className="h-12 w-12 text-muted-foreground/60" />
					)}
				</div>
				<h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
				{message && (
					<p className="text-sm text-muted-foreground max-w-md mb-6">{message}</p>
				)}
				<div className="flex flex-wrap gap-3 justify-center">
					{onRefresh && (
						<Button variant="outline" onClick={onRefresh}>Refresh</Button>
					)}
					{actionLabel && actionHandler && (
						<Button onClick={actionHandler}>{actionLabel}</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
