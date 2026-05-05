'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, BookOpen, Users, TrendingUp, Calendar, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { TrainerBadge } from '@/components/custom/trainer/TrainerBadge';
import { useEffect, useState } from 'react';
import { trainerApi, authApi } from '@/lib/api/client';
import { AwarenessSessionRequestResponse } from '@/types/awareness-session';

export default function TrainerDashboard() {
	const router = useRouter();
	const [user, setUser] = useState<any>(null);
	const [requests, setRequests] = useState<AwarenessSessionRequestResponse[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [userRes, requestsRes] = await Promise.all([
					authApi.me(),
					trainerApi.getAwarenessSessionRequests(1, 1000) // Fetch sufficient history for stats
				]);

				if (userRes.success) setUser(userRes.data);
				if (requestsRes.success) setRequests(requestsRes.data?.requests || []);

			} catch (err) {
				console.error("Failed to load dashboard data", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading || !user) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
			</div>
		);
	}

	// Calculate Stats
	const totalRequests = requests.length;
	const confirmedSessions = requests.filter(r => r.status === 'confirmed').length;
	const pendingResponse = requests.filter(r => r.status === 'forwarded_to_expert').length;
	const acceptanceRate = totalRequests > 0 ? Math.round((confirmedSessions / totalRequests) * 100) : 0;

	// Sessions this month
	const now = new Date();
	const thisMonthSessions = requests.filter(r => {
		const d = new Date(r.sessionDate);
		return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
	}).length;

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-3 mb-1">
						<h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
						<TrainerBadge />
					</div>
					<p className="text-gray-500">
						Welcome back, <span className="font-semibold text-gray-900">{user.firstName}</span>. Here's what's happening today.
					</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={() => router.push('/trainer/awareness-sessions')} className="bg-purple-600 hover:bg-purple-700">
						View Requests
						<ChevronRight className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Key Metrics Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
						<Users className="h-4 w-4 text-purple-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">{totalRequests}</div>
						<p className="text-xs text-gray-500">Lifetime requests</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">Confirmed</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">{confirmedSessions}</div>
						<p className="text-xs text-gray-500">{acceptanceRate}% acceptance rate</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
						<Clock className="h-4 w-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">{pendingResponse}</div>
						<p className="text-xs text-gray-500">Awaiting your response</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
						<Calendar className="h-4 w-4 text-blue-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900">{thisMonthSessions}</div>
						<p className="text-xs text-gray-500">Sessions scheduled</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Content Area: Quick Actions & Recent/Status */}
			<div className="grid gap-8 md:grid-cols-7">

				{/* Quick Actions & Status - Left/Main Column */}
				<div className="md:col-span-4 space-y-8">
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>Manage your activities</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
								onClick={() => router.push('/trainer/resources')}
							>
								<BookOpen className="h-6 w-6" />
								<span>Resources</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all"
								onClick={() => router.push('/trainer/awareness-sessions')}
							>
								<Users className="h-6 w-6" />
								<span>Requests</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
								onClick={() => router.push('/trainer/schedule')}
							>
								<Calendar className="h-6 w-6" />
								<span>Schedule</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
								onClick={() => router.push('/expert/dashboard')}
							>
								<TrendingUp className="h-6 w-6" />
								<span>Expert Mode</span>
							</Button>
						</CardContent>
					</Card>

					{/* Status Breakdown (Mini) */}
					<Card>
						<CardHeader>
							<CardTitle>Session Status</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-600">Confirmed</span>
									<span className="font-medium">{confirmedSessions} / {totalRequests}</span>
								</div>
								<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
									<div
										className="h-full bg-green-500 rounded-full"
										style={{ width: `${acceptanceRate}%` }}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-600">Pending</span>
									<span className="font-medium">{pendingResponse}</span>
								</div>
								<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
									<div
										className="h-full bg-orange-500 rounded-full"
										style={{ width: `${totalRequests > 0 ? (pendingResponse / totalRequests) * 100 : 0}%` }}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Benefits / Info - Right Column */}
				<div className="md:col-span-3">
					<Card className="h-full border-0 shadow-none bg-gradient-to-br from-purple-50 to-white">
						<CardHeader>
							<CardTitle className="text-purple-900">Trainer Privileges</CardTitle>
							<CardDescription className="text-purple-700">Your exclusive benefits</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-4">
								<li className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-100">
									<Award className="h-5 w-5 text-purple-600 mt-0.5" />
									<div>
										<p className="font-medium text-purple-900">Official Recognition</p>
										<p className="text-xs text-purple-700">Verified Kavach Trainer status</p>
									</div>
								</li>
								<li className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-100">
									<BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
									<div>
										<p className="font-medium text-purple-900">Resource Access</p>
										<p className="text-xs text-purple-700">Premium training materials</p>
									</div>
								</li>
								<li className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-100">
									<Users className="h-5 w-5 text-purple-600 mt-0.5" />
									<div>
										<p className="font-medium text-purple-900">Network Growth</p>
										<p className="text-xs text-purple-700">Connect with organizations</p>
									</div>
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
