'use client';

import React from 'react';
import QuoteManagement from '@/components/custom/admin/QuoteManagement';

export default function QuoteManagementPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-2">Quote Management</h1>
				<p className="text-muted-foreground">
					Manage quotes and pricing
				</p>
			</div>

			<QuoteManagement />
		</div>
	);
}
