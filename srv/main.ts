import cds, { Request, Service } from '@sap/cds';
import { Customers, Product, Products, SalesOrderHeaders, SalesOrderItem, SalesOrderItems } from '@models/sales';
import { customerController } from './factories/controllers/customer';
import { salesOrderHeaderController } from './factories/controllers/sales-order-header';
import { FullRequestParams } from './protocols';

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
    service.after('READ', 'Customers', (customersList: Customers, request) => {
        (request as unknown as FullRequestParams<Customers>).results = customerController.afterRead(customersList);
    });
    service.before('CREATE', 'SalesOrderHeaders', async (request: Request) => {
        const result = await salesOrderHeaderController.beforeCreate(request.data);
        if (result.hasError) {
            return request.reject(400, result.error?.message as string);
        }
        request.data.totalAmount = result.totalAmount;
    });
    service.after('CREATE', 'SalesOrderHeaders', async (results: SalesOrderHeaders, request: Request) => {
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
            const headerAsString = JSON.stringify(header);
            const userAsString = JSON.stringify(request.user);
            const log = {
                header_id: header.id,
                userData: userAsString,
                orderData: headerAsString,
            }
            await cds.create('sales.SalesOrderLogs').entries(log);
        }
    });
}