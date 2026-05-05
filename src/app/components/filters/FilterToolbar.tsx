"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { Search, Calendar as CalendarIcon, X } from 'lucide-react';


export type SessionModeOption = 'all' | 'on_site' | 'online';

export interface FilterOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
}

export interface FilterConfig {
	id: string;
	label: string;
	type: 'select' | 'chips';
	options?: FilterOption[];
}

export interface FilterToolbarProps {
	className?: string;
	// Search
	searchValue?: string;
	onSearchChange?: (v: string) => void;
	placeholder?: string;
	// Session Mode (Legacy/Specific)
	showSessionMode?: boolean;
	sessionMode?: SessionModeOption;
	onSessionModeChange?: (v: SessionModeOption) => void;
	// Date Range (Legacy/Specific)
	showDateRange?: boolean;
	startDate?: Date;
	endDate?: Date;
	onStartDateChange?: (d?: Date) => void;
	onEndDateChange?: (d?: Date) => void;
	// Generic Filters
	filters?: FilterConfig[];
	filterValues?: Record<string, any>;
	onFilterChange?: (id: string, value: any) => void;
	// Clear
	onClear?: () => void;
	onClearAll?: () => void; // Alias/Alternative for onClear
	// Right side extra area
	rightArea?: React.ReactNode;
}

export function FilterToolbar({
	className,
	searchValue,
	onSearchChange,
	placeholder = 'Search…',
	showSessionMode,
	sessionMode = 'all',
	onSessionModeChange,
	showDateRange,
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	filters,
	filterValues,
	onFilterChange,
	onClear,
	onClearAll,
	rightArea,
}: FilterToolbarProps) {
	const [openStart, setOpenStart] = React.useState(false);
	const [openEnd, setOpenEnd] = React.useState(false);

	const handleClear = onClear || onClearAll;

	return (
		<div className={cn("w-full space-y-4", className)}>
			<div className="flex flex-col gap-4">
				{/* Top Row: Search and Right Actions */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					{onSearchChange && (
						<div className="relative w-full sm:max-w-md transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 rounded-full">
							<Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder={placeholder}
								value={searchValue || ''}
								onChange={(e) => onSearchChange(e.target.value)}
								className="pl-11 h-10 rounded-lg bg-card border-border hover:border-primary/50 focus:border-primary/50 focus:ring-primary transition-colors placeholder:text-muted-foreground/80 text-foreground shadow-sm"
								aria-label="Search"
							/>
						</div>
					)}
					{rightArea && (
						<div className="flex items-center gap-2 self-end sm:self-auto">
							{rightArea}
						</div>
					)}
				</div>

				{/* Filters Row */}
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 flex-wrap">
						{/* Chip Filters (Visual Tabs) */}
						{filters?.filter(f => f.type === 'chips').map((filter) => (
							<div key={filter.id} className="flex items-center bg-muted/30 p-1 rounded-full border border-muted-foreground/10">
								<button
									onClick={() => onFilterChange?.(filter.id, 'all')}
									className={cn(
										"px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
										(!filterValues?.[filter.id] || filterValues[filter.id] === 'all')
											? "bg-primary text-white shadow-md ring-1 ring-primary"
											: "text-muted-foreground bg-card border border-border hover:text-primary hover:bg-primary/10 hover:border-primary/50"
									)}
								>
									All
								</button>
								{filter.options?.map((option) => (
									<button
										key={option.value}
										onClick={() => onFilterChange?.(filter.id, option.value)}
										className={cn(
											"px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
											filterValues?.[filter.id] === option.value
												? "bg-primary text-white shadow-md ring-1 ring-primary"
												: "text-muted-foreground bg-card border border-border hover:text-primary hover:bg-primary/10 hover:border-primary/50"
										)}
									>
										{option.icon}
										{option.label}
									</button>
								))}
							</div>
						))}

						<div className="h-6 w-px bg-border hidden lg:block mx-2" />

						{/* Standard Select Filters */}
						{filters?.filter(f => f.type === 'select').map((filter) => (
							<Select
								key={filter.id}
								value={filterValues?.[filter.id] || 'all'}
								onValueChange={(v) => onFilterChange?.(filter.id, v)}
							>
								<SelectTrigger className="w-[180px] h-10 rounded-lg border-border bg-card hover:bg-muted/50 text-foreground/80 transition-colors focus:ring-primary">
									<SelectValue placeholder={filter.label} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All {filter.label}</SelectItem>
									{filter.options?.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											<div className="flex items-center gap-2">
												{option.icon}
												<span>{option.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						))}

						{/* Legacy Session Mode Filter */}
						{showSessionMode && onSessionModeChange && (
							<Select value={sessionMode} onValueChange={(v: any) => onSessionModeChange(v)}>
								<SelectTrigger className="w-[180px] h-10 rounded-lg border-border bg-card hover:bg-muted/50 text-foreground/80 transition-colors focus:ring-primary">
									<SelectValue placeholder="Session Mode" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Modes</SelectItem>
									<SelectItem value="on_site">On-site</SelectItem>
									<SelectItem value="online">Online</SelectItem>
								</SelectContent>
							</Select>
						)}

						{/* Date Filters */}
						{(showDateRange) && (
							<div className="flex items-center gap-2 bg-muted/30 p-1 rounded-full border border-muted-foreground/10">
								<Popover open={openStart} onOpenChange={setOpenStart}>
									<PopoverTrigger asChild>
										<button
											className={cn(
												"px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 border",
												startDate
													? "bg-primary/10 text-primary border-primary/50"
													: "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
											)}
										>
											<CalendarIcon className="h-3.5 w-3.5" />
											{startDate ? startDate.toLocaleDateString() : 'Start'}
										</button>
									</PopoverTrigger>
									<PopoverContent className="p-0 w-auto" align="start">
										<DatePicker
											mode="single"
											selected={startDate}
											onSelect={(date: any) => { onStartDateChange && onStartDateChange(date || undefined); setOpenStart(false); }}
										/>
									</PopoverContent>
								</Popover>

								<span className="text-muted-foreground/30 text-xs">to</span>

								<Popover open={openEnd} onOpenChange={setOpenEnd}>
									<PopoverTrigger asChild>
										<button
											className={cn(
												"px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 border",
												endDate
													? "bg-primary/10 text-primary border-primary/50"
													: "text-muted-foreground border-border bg-card hover:text-foreground hover:bg-muted/50"
											)}
										>
											<CalendarIcon className="h-3.5 w-3.5" />
											{endDate ? endDate.toLocaleDateString() : 'End'}
										</button>
									</PopoverTrigger>
									<PopoverContent className="p-0 w-auto" align="start">
										<DatePicker
											mode="single"
											selected={endDate}
											onSelect={(date: any) => { onEndDateChange && onEndDateChange(date || undefined); setOpenEnd(false); }}
										/>
									</PopoverContent>
								</Popover>
							</div>
						)}

						{handleClear && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClear}
								className="h-9 px-3 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 ml-auto lg:ml-0"
							>
								<X className="h-3.5 w-3.5 mr-1.5" />
								Clear
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default FilterToolbar;
