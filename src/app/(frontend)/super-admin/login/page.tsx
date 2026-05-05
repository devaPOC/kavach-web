'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginStep = 'email' | 'otp';

export default function SuperAdminLoginPage() {
	const router = useRouter();
	const [step, setStep] = useState<LoginStep>('email');
	const [email, setEmail] = useState('');
	const [otp, setOtp] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/v1/super-admin/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (data.success) {
				setMessage(data.message);
				setStep('otp');
			} else {
				setError(data.message || 'Failed to send OTP');
			}
		} catch (err) {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/v1/super-admin/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code: otp }),
			});

			const data = await response.json();

			if (data.success) {
				router.push('/super-admin/dashboard');
			} else {
				setError(data.message || 'Invalid OTP');
			}
		} catch (err) {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleResendOtp = async () => {
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/v1/super-admin/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();
			if (data.success) {
				setMessage('New OTP sent to your email.');
			} else {
				setError(data.message || 'Failed to resend OTP');
			}
		} catch (err) {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
			padding: '20px',
		}}>
			<div style={{
				width: '100%',
				maxWidth: '420px',
				backgroundColor: 'white',
				borderRadius: '16px',
				boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
				overflow: 'hidden',
			}}>
				{/* Header */}
				<div style={{
					background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
					padding: '32px',
					textAlign: 'center',
				}}>
					<h1 style={{
						color: 'white',
						fontSize: '24px',
						fontWeight: '700',
						margin: '0 0 8px 0',
					}}>
						Super Admin
					</h1>
					<p style={{
						color: 'rgba(255, 255, 255, 0.8)',
						fontSize: '14px',
						margin: 0,
					}}>
						Secure access with email verification
					</p>
				</div>

				{/* Form */}
				<div style={{ padding: '32px' }}>
					{step === 'email' ? (
						<form onSubmit={handleSendOtp}>
							<div style={{ marginBottom: '24px' }}>
								<label style={{
									display: 'block',
									fontSize: '14px',
									fontWeight: '500',
									color: '#374151',
									marginBottom: '8px',
								}}>
									Email Address
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="admin@kavach.om"
									required
									style={{
										width: '100%',
										padding: '12px 16px',
										fontSize: '16px',
										border: '2px solid #e5e7eb',
										borderRadius: '8px',
										outline: 'none',
										transition: 'border-color 0.2s',
										boxSizing: 'border-box',
									}}
									onFocus={(e) => e.target.style.borderColor = '#1e40af'}
									onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
								/>
							</div>

							{error && (
								<div style={{
									backgroundColor: '#fef2f2',
									color: '#dc2626',
									padding: '12px',
									borderRadius: '8px',
									marginBottom: '16px',
									fontSize: '14px',
								}}>
									{error}
								</div>
							)}

							<button
								type="submit"
								disabled={loading}
								style={{
									width: '100%',
									padding: '14px',
									fontSize: '16px',
									fontWeight: '600',
									color: 'white',
									backgroundColor: loading ? '#9ca3af' : '#1e40af',
									border: 'none',
									borderRadius: '8px',
									cursor: loading ? 'not-allowed' : 'pointer',
									transition: 'background-color 0.2s',
								}}
							>
								{loading ? 'Sending...' : 'Send Verification Code'}
							</button>
						</form>
					) : (
						<form onSubmit={handleVerifyOtp}>
							<div style={{ textAlign: 'center', marginBottom: '24px' }}>
								<p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>
									We sent a code to
								</p>
								<p style={{ color: '#1f2937', fontWeight: '600', margin: 0 }}>
									{email}
								</p>
							</div>

							<div style={{ marginBottom: '24px' }}>
								<label style={{
									display: 'block',
									fontSize: '14px',
									fontWeight: '500',
									color: '#374151',
									marginBottom: '8px',
								}}>
									Verification Code
								</label>
								<input
									type="text"
									value={otp}
									onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
									placeholder="000000"
									required
									maxLength={6}
									style={{
										width: '100%',
										padding: '16px',
										fontSize: '24px',
										fontWeight: '700',
										textAlign: 'center',
										letterSpacing: '8px',
										border: '2px solid #e5e7eb',
										borderRadius: '8px',
										outline: 'none',
										boxSizing: 'border-box',
									}}
									onFocus={(e) => e.target.style.borderColor = '#1e40af'}
									onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
								/>
							</div>

							{error && (
								<div style={{
									backgroundColor: '#fef2f2',
									color: '#dc2626',
									padding: '12px',
									borderRadius: '8px',
									marginBottom: '16px',
									fontSize: '14px',
								}}>
									{error}
								</div>
							)}

							{message && (
								<div style={{
									backgroundColor: '#f0fdf4',
									color: '#16a34a',
									padding: '12px',
									borderRadius: '8px',
									marginBottom: '16px',
									fontSize: '14px',
								}}>
									{message}
								</div>
							)}

							<button
								type="submit"
								disabled={loading || otp.length !== 6}
								style={{
									width: '100%',
									padding: '14px',
									fontSize: '16px',
									fontWeight: '600',
									color: 'white',
									backgroundColor: loading || otp.length !== 6 ? '#9ca3af' : '#1e40af',
									border: 'none',
									borderRadius: '8px',
									cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
									marginBottom: '16px',
								}}
							>
								{loading ? 'Verifying...' : 'Verify & Login'}
							</button>

							<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
								<button
									type="button"
									onClick={() => setStep('email')}
									style={{
										color: '#6b7280',
										backgroundColor: 'transparent',
										border: 'none',
										cursor: 'pointer',
									}}
								>
									← Change email
								</button>
								<button
									type="button"
									onClick={handleResendOtp}
									disabled={loading}
									style={{
										color: '#1e40af',
										backgroundColor: 'transparent',
										border: 'none',
										cursor: loading ? 'not-allowed' : 'pointer',
										fontWeight: '500',
									}}
								>
									Resend code
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
