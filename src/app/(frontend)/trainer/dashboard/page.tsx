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
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
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
						<h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
						<TrainerBadge />
					</div>
					<p className="text-muted-foreground">
						Welcome back, <span className="font-semibold text-foreground">{user.firstName}</span>. Here's what's happening today.
					</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={() => router.push('/trainer/awareness-sessions')} className="bg-primary hover:bg-primary">
						View Requests
						<ChevronRight className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Key Metrics Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
						<Users className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{totalRequests}</div>
						<p className="text-xs text-muted-foreground">Lifetime requests</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
						<CheckCircle className="h-4 w-4 text-secondary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{confirmedSessions}</div>
						<p className="text-xs text-muted-foreground">{acceptanceRate}% acceptance rate</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
						<Clock className="h-4 w-4 text-accent" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{pendingResponse}</div>
						<p className="text-xs text-muted-foreground">Awaiting your response</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
						<Calendar className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{thisMonthSessions}</div>
						<p className="text-xs text-muted-foreground">Sessions scheduled</p>
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
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:text-accent hover:bg-accent/10 transition-all"
								onClick={() => router.push('/trainer/resources')}
							>
								<BookOpen className="h-6 w-6" />
								<span>Resources</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-secondary/50 hover:text-secondary hover:bg-secondary/10 transition-all"
								onClick={() => router.push('/trainer/awareness-sessions')}
							>
								<Users className="h-6 w-6" />
								<span>Requests</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all"
								onClick={() => router.push('/trainer/schedule')}
							>
								<Calendar className="h-6 w-6" />
								<span>Schedule</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex flex-col items-center justify-center gap-2 hover:border-border/80 hover:text-foreground hover:bg-muted/50 transition-all"
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
									<span className="text-muted-foreground">Confirmed</span>
									<span className="font-medium">{confirmedSessions} / {totalRequests}</span>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-secondary rounded-full"
										style={{ width: `${acceptanceRate}%` }}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Pending</span>
									<span className="font-medium">{pendingResponse}</span>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-accent rounded-full"
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
							<CardTitle className="text-primary">Trainer Privileges</CardTitle>
							<CardDescription className="text-primary">Your exclusive benefits</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-4">
								<li className="flex items-start gap-3 p-3 bg-card rounded-lg shadow-sm border border-primary/50">
									<Award className="h-5 w-5 text-accent mt-0.5" />
									<div>
										<p className="font-medium text-primary">Official Recognition</p>
										<p className="text-xs text-primary">Verified Kavach Trainer status</p>
									</div>
								</li>
								<li className="flex items-start gap-3 p-3 bg-card rounded-lg shadow-sm border border-primary/50">
									<BookOpen className="h-5 w-5 text-accent mt-0.5" />
									<div>
										<p className="font-medium text-primary">Resource Access</p>
										<p className="text-xs text-primary">Premium training materials</p>
									</div>
								</li>
								<li className="flex items-start gap-3 p-3 bg-card rounded-lg shadow-sm border border-primary/50">
									<Users className="h-5 w-5 text-accent mt-0.5" />
									<div>
										<p className="font-medium text-primary">Network Growth</p>
										<p className="text-xs text-primary">Connect with organizations</p>
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
