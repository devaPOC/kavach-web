import { NextRequest } from 'next/server';
import { customerController } from '@/lib/controllers/customer/customer.controller';

async function handleGetServiceRequestById(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return customerController.getServiceRequestById(request, id);
}

export { handleGetServiceRequestById as GET };
