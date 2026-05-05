"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlsProps {
	page: number;
	totalPages: number;
	startLabel?: string; // e.g., "Showing 1 to 10 of 42"
	onPrev: () => void;
	onNext: () => void;
	className?: string;
}

export function PaginationControls({ page, totalPages, startLabel, onPrev, onNext, className }: PaginationControlsProps) {
	if (totalPages <= 1) return null;

	return (
		<div className={className || "flex items-center justify-between mt-6"}>
			{startLabel && (
				<div className="text-sm text-muted-foreground font-medium">{startLabel}</div>
			)}
			<div className="flex items-center gap-2 ml-auto">
				<Button
					variant="outline"
					size="sm"
					onClick={onPrev}
					disabled={page === 1}
					className="flex items-center gap-1"
					aria-label="Previous page"
				>
					<ChevronLeft className="h-3 w-3" />
					Previous
				</Button>
				<span className="text-sm text-muted-foreground font-medium" aria-live="polite">
					Page {page} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={onNext}
					disabled={page === totalPages}
					className="flex items-center gap-1"
					aria-label="Next page"
				>
					Next
					<ChevronRight className="h-3 w-3" />
				</Button>
			</div>
		</div>
	);
}

export default PaginationControls;
