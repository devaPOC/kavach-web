'use client';

import React from 'react';
import QuizManager from '@/components/custom/admin/QuizManager';

export default function QuizManagerPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-2">Quiz Manager</h1>
				<p className="text-muted-foreground">
					Manage awareness lab quizzes
				</p>
			</div>

			<QuizManager />
		</div>
	);
}
