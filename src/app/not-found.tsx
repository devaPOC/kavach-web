'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, MoveLeft } from 'lucide-react'

export default function NotFound() {
	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="max-w-md w-full text-center space-y-6">
				{/* Minimal Icon */}
				<div className="flex justify-center">
					<div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center">
						<FileQuestion className="h-10 w-10 text-gray-400" />
					</div>
				</div>

				{/* Main 404 */}
				<h1 className="text-6xl font-black tracking-tight text-gray-900">
					404
				</h1>

				{/* Sarcastic but clear message */}
				<div className="space-y-2">
					<h2 className="text-xl font-semibold text-gray-700">Well, this is awkward.</h2>
					<p className="text-gray-500 text-sm leading-relaxed">
						You're looking for something that doesn't exist.
						Maybe it moved? Maybe it's a ghost?
						Or maybe you just have a really creative imagination.
						Either way, there's nothing here.
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
							Take Me Home
						</Link>
					</Button>
				</div>

				<div className="pt-12 text-xs text-gray-400 font-mono">
					Error Code: ID_10_T / Page_Not_Found
				</div>
			</div>
		</div>
	)
}
