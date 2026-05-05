'use client';

import React from 'react';
import ServiceManagement from '@/components/custom/admin/ServiceManagement';

export default function ServiceRequestsPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-2">Service Requests</h1>
				<p className="text-muted-foreground">
					Manage service requests and customer services
				</p>
			</div>

			<ServiceManagement />
		</div>
	);
}
