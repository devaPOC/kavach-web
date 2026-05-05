'use client';

import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';

interface TrainerBadgeProps {
	variant?: 'default' | 'outline' | 'secondary';
	className?: string;
}

export function TrainerBadge({ variant = 'default', className = '' }: TrainerBadgeProps) {
	return (
		<Badge
			variant={variant}
			className={`bg-primary/10 text-primary border-primary/50 ${className}`}
		>
			<Award className="w-3 h-3 mr-1" />
			Trainer
		</Badge>
	);
}
