import { NextRequest } from 'next/server';
import { CustomerController } from '@/lib/controllers/customer/customer.controller';

const customerController = new CustomerController();

async function handleGetCustomerServiceRequests(request: NextRequest) {
  return customerController.getCustomerServiceRequests(request);
}

async function handleCreateServiceRequest(request: NextRequest) {
  return customerController.createServiceRequest(request);
}

export {
  handleGetCustomerServiceRequests as GET,
  handleCreateServiceRequest as POST
};
