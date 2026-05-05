'use client'
import React from 'react'
import { AwarenessLabTab } from '@/components/custom/awareness-lab'

export default function ExpertAwarenessLabPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Awareness Lab</h1>
				<p className="text-gray-600">
					Access learning materials and complete quizzes.
				</p>
			</div>
			<AwarenessLabTab />
		</div>
	)
}
