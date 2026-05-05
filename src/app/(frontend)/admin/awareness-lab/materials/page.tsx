'use client';

import React from 'react';
import MaterialsManager from '@/components/custom/admin/MaterialsManager';

export default function MaterialsManagerPage() {
	return (
		<div className="p-4 lg:p-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-2">Materials Manager</h1>
				<p className="text-muted-foreground">
					Manage learning materials for the awareness hub
				</p>
			</div>

			<MaterialsManager />
		</div>
	);
}
