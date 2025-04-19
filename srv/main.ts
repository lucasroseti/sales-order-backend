import cds, { Request, Service } from '@sap/cds';
import { Customers, Product, Products, SalesOrderHeaders, SalesOrderItem, SalesOrderItems } from '@models/sales';

export default (service: Service) => {
    service.before('READ', '*', async (request: Request) => {
        if (!request.user.is('read_only_user')) {
            return request.reject(403, 'Forbidden');
        }
    });
    service.before(['WRITE','DELETE'], '*', async (request: Request) => {
        if (!request.user.is('admin')) {
            return request.reject(403, 'Not allowed create or delete operations');
        }
    });
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
        let totalAmount = 0;
        items.forEach((item) => {
            totalAmount += (item.price as number) * (item.quantity as number);
        });
        request.data.totalAmount = totalAmount;
        console.log('totalAmount', totalAmount);
    });
    service.after('CREATE', 'SalesOrderHeaders', async (results: SalesOrderHeaders) => {
        const headersAsArray = Array.isArray(results) ? results : [results] as SalesOrderHeaders;
        for (const header of headersAsArray) {
            const items = header.items as SalesOrderItems;
            const productsData = items.map((item: SalesOrderItem) => ({
                id: item.product_id as string,
                quantity: item.quantity as number
            }));
            const productsIds: string[] = productsData.map((productData) => productData.id);
            const productQuery = SELECT.from('sales.Products').where({ id: productsIds });
            const products: Products = await cds.run(productQuery);
            for (const productData of productsData) {
                const foundProduct = products.find((product) => product.id === productData.id) as Product;
                foundProduct.stock = (foundProduct.stock as number) - productData.quantity;
                await cds.update('sales.Products').where({ id: foundProduct.id }).with({ stock: foundProduct.stock });
            }
        }
    });
}