import { Customers } from '@models/sales';

import { CustomerController } from '@/controllers/customer/protocols';
import { CustomerService } from '@/services/customer/protocols';

export class CustomerControllerImpl implements CustomerController {
    constructor(private readonly service: CustomerService) {}

    afterRead(customerList: Customers): Customers {
        return this.service.afterRead(customerList);
    }
}
