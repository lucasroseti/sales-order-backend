import cds, { Request, Service } from '@sap/cds';
import { Customers, Products, SalesOrderItem, SalesOrderItems } from '@models/sales';

export default (service: Service) => {
    service.after('READ', 'Customers', (results: Customers) => {
        results.forEach(customer => {
            if (!customer.email.includes('@')) {
                customer.email = `${customer.email}@email.com`;
            }
        });
    });
    service.before('CREATE', 'SalesOrderHeaders', async (request: Request) => {
        const params = request.data;
        const items: SalesOrderItems = params.items;
        if (!params.customer_id) {
            return request.reject(400, 'Customer invalid');
        }
        if (!params.items || params.items?.length === 0) {
            return request.reject(400, 'Items are required');
        }
        const customerQuery = SELECT.one.from('sales.Customers').where({ id: params.customer_id });
        const customer = await cds.run(customerQuery);
        if (!customer) {
            return request.reject(404, 'Customer not found');
        }
        const productsIds: string[] = params.items?.map((item: SalesOrderItem) => item.product_id);
        const productQuery = SELECT.from('sales.Products').where({ id: productsIds });
        const products: Products = await cds.run(productQuery);
        for (const item of items) {
            const dbProduct = products.find(product => product.id === item.product_id);
            if (!dbProduct) {
                return request.reject(400, `Product ${item.product_id} not found`);
            }
            if (dbProduct.stock === 0) {
                return request.reject(400, `Product ${dbProduct.name} not in stock`);
            }
        }
    });
}