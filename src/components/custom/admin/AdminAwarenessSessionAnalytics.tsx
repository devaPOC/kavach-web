'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import {
    Calendar as CalendarIcon,
    Download,
    TrendingUp,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileText,
    BarChart3,
    PieChart as PieChartIcon,
    Filter,
    RefreshCw
} from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'

interface AnalyticsData {
    dateRange: {
        startDate: string;
        endDate: string;
    };
    requestVolume: {
        totalRequests: number;
        requestsByStatus: Record<string, number>;
        requestsByMonth: Array<{
            month: string;
            year: number;
            count: number;
        }>;
        requestsByWeek: Array<{
            week: string;
            count: number;
        }>;
        averageRequestsPerDay: number;
    };
    expertUtilization: {
        totalExperts: number;
        activeExperts: number;
        expertAssignments: Array<{
            expertId: string;
            expertName: string;
            expertEmail: string;
            totalAssigned: number;
            totalConfirmed: number;
            totalDeclined: number;
            acceptanceRate: number;
            averageResponseTime: number;
        }>;
        unassignedRequests: number;
        reassignmentRate: number;
    };
    sessionAnalytics: {
        sessionsByDuration: Record<string, number>;
        sessionsByMode: Record<string, number>;
        sessionsByAudienceType: Record<string, number>;
        averageAudienceSize: number;
        totalAudienceReached: number;
        popularTopics: Array<{
            topic: string;
            count: number;
        }>;
        locationDistribution: Array<{
            location: string;
            count: number;
        }>;
    };
    trendAnalysis: {
        requestTrends: Array<{
            period: string;
            requests: number;
            confirmed: number;
            rejected: number;
            conversionRate: number;
        }>;
        seasonalPatterns: Array<{
            month: number;
            monthName: string;
            averageRequests: number;
            peakYear: number;
        }>;
        statusTransitionTimes: Record<string, number>;
    };
    generatedAt: string;
}

interface AdminAwarenessSessionAnalyticsProps {
    onRefresh?: () => void;
}

const STATUS_COLORS = {
    'pending_admin_review': '#f59e0b',
    'forwarded_to_expert': '#3b82f6',
    'confirmed': '#10b981',
    'rejected': '#ef4444',
    'expert_declined': '#f97316'
};

const STATUS_LABELS = {
    'pending_admin_review': 'Pending Review',
    'forwarded_to_expert': 'With Expert',
    'confirmed': 'Confirmed',
    'rejected': 'Rejected',
    'expert_declined': 'Expert Declined'
};

const DURATION_LABELS = {
    '1_hour': '1 Hour',
    '2_hours': '2 Hours',
    'half_day': 'Half Day',
    'full_day': 'Full Day'
};

const MODE_LABELS = {
    'on_site': 'On-site',
    'online': 'Online'
};

export default function AdminAwarenessSessionAnalytics({ onRefresh }: AdminAwarenessSessionAnalyticsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [dateRange, setDateRange] = useState({
        startDate: subMonths(new Date(), 6),
        endDate: new Date()
    })
    const [showStartCalendar, setShowStartCalendar] = useState(false)
    const [showEndCalendar, setShowEndCalendar] = useState(false)
    const [exporting, setExporting] = useState(false)

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            setError('')

            const params = new URLSearchParams({
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString()
            })

            const response = await fetch(`/api/v1/admin/awareness-sessions/analytics?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json()

            if (result.success && result.data) {
                setAnalytics(result.data)
            } else {
                setError(result.error || 'Failed to fetch analytics')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch analytics')
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (format: 'csv' | 'pdf') => {
        try {
            setExporting(true)

            const params = new URLSearchParams({
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString(),
                format,
                includeDetails: 'true'
            })

            const response = await fetch(`/api/v1/admin/awareness-sessions/analytics?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
            })

            if (!response.ok) {
                throw new Error(`Export failed: HTTP ${response.status}`)
            }

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition')
            const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `analytics.${format}`

            // Create blob and download
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err: any) {
            setError(err.message || `Failed to export ${format.toUpperCase()}`)
        } finally {
            setExporting(false)
        }
    }

    const handleDateRangePreset = (preset: string) => {
        const now = new Date()
        switch (preset) {
            case 'last7days':
                setDateRange({
                    startDate: subDays(now, 7),
                    endDate: now
                })
                break
            case 'last30days':
                setDateRange({
                    startDate: subDays(now, 30),
                    endDate: now
                })
                break
            case 'last3months':
                setDateRange({
                    startDate: subMonths(now, 3),
                    endDate: now
                })
                break
            case 'last6months':
                setDateRange({
                    startDate: subMonths(now, 6),
                    endDate: now
                })
                break
            case 'last12months':
                setDateRange({
                    startDate: subMonths(now, 12),
                    endDate: now
                })
                break
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    // Prepare chart data
    const statusChartData = analytics ? Object.entries(analytics.requestVolume.requestsByStatus).map(([status, count]) => ({
        name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
        value: count,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
    })) : []

    const monthlyTrendData = analytics?.requestVolume.requestsByMonth.map(item => ({
        name: `${item.month} ${item.year}`,
        requests: item.count
    })) || []

    const conversionTrendData = analytics?.trendAnalysis.requestTrends.map(item => ({
        name: format(new Date(item.period), 'MMM yyyy'),
        requests: item.requests,
        confirmed: item.confirmed,
        rejected: item.rejected,
        conversionRate: item.conversionRate
    })) || []

    const durationChartData = analytics ? Object.entries(analytics.sessionAnalytics.sessionsByDuration).map(([duration, count]) => ({
        name: DURATION_LABELS[duration as keyof typeof DURATION_LABELS] || duration,
        value: count
    })) : []

    const modeChartData = analytics ? Object.entries(analytics.sessionAnalytics.sessionsByMode).map(([mode, count]) => ({
        name: MODE_LABELS[mode as keyof typeof MODE_LABELS] || mode,
        value: count
    })) : []

    if (loading && !analytics) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/50"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Awareness Session Analytics
                            </CardTitle>
                            <CardDescription>
                                Comprehensive analytics and reporting for awareness session requests
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchAnalytics}
                                disabled={loading}
                                className="flex items-center gap-1"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExport('csv')}
                                disabled={exporting || !analytics}
                                className="flex items-center gap-1"
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExport('pdf')}
                                disabled={exporting || !analytics}
                                className="flex items-center gap-1"
                            >
                                <Download className="h-4 w-4" />
                                Export PDF Data
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Date Range Controls */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Date Range:</span>
                        </div>

                        <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {format(dateRange.startDate, 'MMM dd, yyyy')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateRange.startDate}
                                    onSelect={(date) => {
                                        if (date) {
                                            setDateRange(prev => ({ ...prev, startDate: date }))
                                            setShowStartCalendar(false)
                                        }
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <span className="text-muted-foreground">to</span>

                        <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {format(dateRange.endDate, 'MMM dd, yyyy')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateRange.endDate}
                                    onSelect={(date) => {
                                        if (date) {
                                            setDateRange(prev => ({ ...prev, endDate: date }))
                                            setShowEndCalendar(false)
                                        }
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleDateRangePreset('last7days')}>
                                7D
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDateRangePreset('last30days')}>
                                30D
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDateRangePreset('last3months')}>
                                3M
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDateRangePreset('last6months')}>
                                6M
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDateRangePreset('last12months')}>
                                1Y
                            </Button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive rounded-md mb-6">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {analytics && (
                <>
                    {/* Key Metrics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium text-foreground/80">Total Requests</span>
                                </div>
                                <p className="text-3xl font-bold text-primary mt-2">{analytics.requestVolume.totalRequests}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {analytics.requestVolume.averageRequestsPerDay.toFixed(1)} per day avg
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-secondary" />
                                    <span className="text-sm font-medium text-foreground/80">Active Experts</span>
                                </div>
                                <p className="text-3xl font-bold text-secondary mt-2">
                                    {analytics.expertUtilization.activeExperts}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    of {analytics.expertUtilization.totalExperts} total
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-secondary" />
                                    <span className="text-sm font-medium text-foreground/80">Confirmed Sessions</span>
                                </div>
                                <p className="text-3xl font-bold text-secondary mt-2">
                                    {analytics.requestVolume.requestsByStatus.confirmed || 0}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {analytics.sessionAnalytics.totalAudienceReached} people reached
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-accent" />
                                    <span className="text-sm font-medium text-foreground/80">Conversion Rate</span>
                                </div>
                                <p className="text-3xl font-bold text-primary mt-2">
                                    {analytics.requestVolume.totalRequests > 0
                                        ? ((analytics.requestVolume.requestsByStatus.confirmed || 0) / analytics.requestVolume.totalRequests * 100).toFixed(1)
                                        : '0'
                                    }%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    requests to confirmed sessions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Request Status Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5" />
                                    Request Status Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Monthly Request Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Monthly Request Volume
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="requests" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Session Duration Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Session Duration Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={durationChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Session Mode Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Session Mode Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={modeChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {modeChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#8b5cf6'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Conversion Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Request Conversion Trends
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={conversionTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="requests" fill="#3b82f6" name="Total Requests" />
                                    <Bar yAxisId="left" dataKey="confirmed" fill="#10b981" name="Confirmed" />
                                    <Bar yAxisId="left" dataKey="rejected" fill="#ef4444" name="Rejected" />
                                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#f59e0b" strokeWidth={2} name="Conversion Rate %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Expert Performance Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Expert Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Expert
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Assigned
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Confirmed
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Declined
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Acceptance Rate
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                Avg Response Time
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-gray-200">
                                        {analytics.expertUtilization.expertAssignments.map((expert) => (
                                            <tr key={expert.expertId} className="hover:bg-muted/50">
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <div className="font-medium text-foreground">{expert.expertName}</div>
                                                        <div className="text-sm text-muted-foreground">{expert.expertEmail}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-foreground">
                                                    {expert.totalAssigned}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-secondary">
                                                    {expert.totalConfirmed}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-destructive">
                                                    {expert.totalDeclined}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        className={
                                                            expert.acceptanceRate >= 80
                                                                ? 'bg-secondary/10 text-secondary border-secondary/50'
                                                                : expert.acceptanceRate >= 60
                                                                    ? 'bg-accent/10 text-accent border-accent/50'
                                                                    : 'bg-destructive/10 text-destructive border-destructive'
                                                        }
                                                    >
                                                        {expert.acceptanceRate.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-foreground">
                                                    {expert.averageResponseTime.toFixed(1)}h
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Popular Topics and Locations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Popular Topics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.sessionAnalytics.popularTopics.slice(0, 5).map((topic, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-sm text-foreground/80 truncate flex-1 mr-2">
                                                {topic.topic}
                                            </span>
                                            <Badge variant="outline">{topic.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Locations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.sessionAnalytics.locationDistribution.slice(0, 5).map((location, index) => (
                                        <div key={index} className="flex items-center justify-between">
                                            <span className="text-sm text-foreground/80 truncate flex-1 mr-2">
                                                {location.location}
                                            </span>
                                            <Badge variant="outline">{location.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}