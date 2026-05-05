'use client'
import React, { useState, useEffect } from 'react'
import { trainerApi } from '@/lib/api/client'
import TrainerAvailabilityCalendar from '@/components/custom/trainer/TrainerAvailabilityCalendar'
import { AwarenessSessionRequestResponse } from '@/types/awareness-session'

export default function TrainerSchedulePage() {
	const [requests, setRequests] = useState<AwarenessSessionRequestResponse[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchRequests = async () => {
			try {
				const result = await trainerApi.getAwarenessSessionRequests(1, 100, { status: 'confirmed' })
				if (result.success && result.data) {
					setRequests(result.data.requests || [])
				}
			} catch (e) {
				console.error('Error fetching requests:', e)
			} finally {
				setLoading(false)
			}
		}
		fetchRequests()
	}, [])

	if (loading) {
		return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>
	}

	return (
		<div className="p-4 lg:p-8">
			<TrainerAvailabilityCalendar confirmedSessions={requests} />
		</div>
	)
}
