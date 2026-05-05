'use client';

import React from 'react';
import ServiceManagement from '@/components/custom/admin/ServiceManagement';

export default function ServiceRequestsPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Service Requests</h1>
				<p className="text-gray-600">
					Manage service requests and customer services
				</p>
			</div>

			<ServiceManagement />
		</div>
	);
}
