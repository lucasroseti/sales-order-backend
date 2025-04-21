import { CustomerServiceImpl } from '../../services/customer/implementation';
import { CustomerService } from '../../services/customer/protocols';

const makeCustomerService = (): CustomerService => {
    return new CustomerServiceImpl();
};

export const customerService = makeCustomerService();