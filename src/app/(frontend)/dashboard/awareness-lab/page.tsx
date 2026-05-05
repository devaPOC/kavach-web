'use client'
import React from 'react'
import { AwarenessLabTab } from '@/components/custom/awareness-lab'
import { LanguageProvider } from '@/lib/contexts/LanguageContext'

export default function AwarenessLabPage() {
	return (
		<div className="space-y-6">
			<LanguageProvider>
				<AwarenessLabTab />
			</LanguageProvider>
		</div>
	)
}
