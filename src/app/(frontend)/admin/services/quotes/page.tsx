'use client';

import React from 'react';
import QuoteManagement from '@/components/custom/admin/QuoteManagement';

export default function QuoteManagementPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Management</h1>
				<p className="text-gray-600">
					Manage quotes and pricing
				</p>
			</div>

			<QuoteManagement />
		</div>
	);
}
