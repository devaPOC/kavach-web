'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ChangePasswordPage() {
	const router = useRouter()
	const [formData, setFormData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.id]: e.target.value })
		setError('')
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')

		// Client-side validation
		if (formData.newPassword.length < 10) {
			setError('New password must be at least 10 characters long')
			setLoading(false)
			return
		}

		if (formData.newPassword !== formData.confirmPassword) {
			setError('Passwords do not match')
			setLoading(false)
			return
		}

		try {
			const response = await fetch('/api/v1/admin/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: formData.currentPassword,
					newPassword: formData.newPassword,
				}),
			})

			const data = await response.json()

			if (data.success) {
				// Redirect to dashboard on success
				router.push('/admin/dashboard')
				router.refresh()
			} else {
				setError(data.message || 'Failed to update password')
			}
		} catch (err) {
			setError('An error occurred. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Change Password</CardTitle>
					<CardDescription>
						For security reasons, you must update your password to continue.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">Current Password</Label>
							<Input
								id="currentPassword"
								type="password"
								required
								value={formData.currentPassword}
								onChange={handleChange}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newPassword">New Password</Label>
							<Input
								id="newPassword"
								type="password"
								required
								minLength={10}
								value={formData.newPassword}
								onChange={handleChange}
							/>
							<p className="text-xs text-gray-500">Minimum 10 characters required</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm New Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								required
								minLength={10}
								value={formData.confirmPassword}
								onChange={handleChange}
							/>
						</div>

						{error && (
							<div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
								{error}
							</div>
						)}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Updating Password...' : 'Update Password'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
