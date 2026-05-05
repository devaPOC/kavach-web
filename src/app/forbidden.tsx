'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldAlert, MoveLeft } from 'lucide-react'

export default function Forbidden() {
	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="max-w-md w-full text-center space-y-6">
				{/* Minimal Icon */}
				<div className="flex justify-center">
					<div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
						<ShieldAlert className="h-10 w-10 text-red-500" />
					</div>
				</div>

				{/* Main 403 */}
				<h1 className="text-6xl font-black tracking-tight text-gray-900">
					403
				</h1>

				{/* Sarcastic but clear message */}
				<div className="space-y-2">
					<h2 className="text-xl font-semibold text-gray-700">Stop right there.</h2>
					<p className="text-gray-500 text-sm leading-relaxed">
						You're trying to access something you shouldn't.
						Is it top secret? Probably.
						Are you on the list? Clearly not.
						Nice try though.
					</p>
				</div>

				{/* Action */}
				<div className="pt-6">
					<Button
						variant="default"
						size="lg"
						className="bg-black hover:bg-gray-800 text-white rounded-full px-8 transition-all hover:scale-105"
						asChild
					>
						<Link href="/">
							<MoveLeft className="mr-2 h-4 w-4" />
							Back to Safety
						</Link>
					</Button>
				</div>

				<div className="pt-12 text-xs text-gray-400 font-mono">
					Error Code: ACCESS_DENIED / Naughty_List_Confirmed
				</div>
			</div>
		</div>
	)
}
