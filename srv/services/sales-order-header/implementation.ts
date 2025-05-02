import { User } from '@sap/cds';

import { SalesOrderHeader, SalesOrderHeaders } from '@models/sales';

import { Payload as BulkCreateSalesOrderPayload } from '@models/db/types/BulkCreateSalesOrder';
import { CustomerModel } from '@/models/customer';
import { CustomerRepository } from '@/repositories/customer/protocols';
import { LoggedUserModel } from '@/models/logged-user';
import { ProductModel } from '@/models/product';
import { ProductRepository } from '@/repositories/product/protocols';
import { SalesOrderHeaderModel } from '@/models/sales-order-header';
import { SalesOrderHeaderRepository } from '@/repositories/sales-order-header/protocols';
import { SalesOrderItemModel } from '@/models/sales-order-item';
import { SalesOrderLogModel } from '@/models/sales-order-log';
import { SalesOrderLogRepository } from '@/repositories/sales-order-log/protocols';
import { CreationPayloadValidationResult, SalesOrderHeaderService } from '@/services/sales-order-header/protocols';

export class SalesOrderHeaderServiceImpl implements SalesOrderHeaderService {
    constructor(
        private readonly salesOrderHeaderRepository: SalesOrderHeaderRepository,
        private readonly customerRepository: CustomerRepository,
        private readonly productRepository: ProductRepository,
        private readonly salesOrderLogRepository: SalesOrderLogRepository
    ) {}

    public async beforeCreate(params: SalesOrderHeader): Promise<CreationPayloadValidationResult> {
        const productsValidation = await this.validateProductsOnCreation(params);
        if (productsValidation.hasError) {
            return productsValidation;
        }
        const items = this.getSalesOrderItems(params, productsValidation.products as ProductModel[]);
        const header = this.getSalesOrderHeader(params, items);
        const customerValidation = await this.validateProductsOnCreation(params);
        if (customerValidation.hasError) {
            return customerValidation;
        }
        const headerValidationResult = header.validateCreationPayload({
            customer_id: (customerValidation.customer as CustomerModel).id
        });
        if (headerValidationResult.hasError) {
            return headerValidationResult;
        }

        return {
            hasError: false,
            totalAmount: header.calculateDiscount()
        };
    }

    public async afterCreate(
        params: SalesOrderHeaders | BulkCreateSalesOrderPayload[],
        loggedUser: User
    ): Promise<void> {
        const logs: SalesOrderLogModel[] = [];
        const headersAsArray = Array.isArray(params) ? params : ([params] as SalesOrderHeaders);
        for (const header of headersAsArray) {
            const products = (await this.getProductsByIds(header)) as ProductModel[];
            const items = this.getSalesOrderItems(header, products);
            const salesOrderHeader = this.getExistingSalesOrderHeader(header, items);
            const productsData = salesOrderHeader.getProductsData();

            for (const product of products) {
                const foundProduct = productsData.find((productData) => productData.id === product.id);
                product.sell(foundProduct?.quantity as number);
                this.productRepository.updateStock(product);
            }
            const user = this.getLoggedUser(loggedUser);
            const log = this.getSalesOrderLog(salesOrderHeader, user);
            logs.push(log);
        }
        await this.salesOrderLogRepository.create(logs);
    }

    // eslint-disable-next-line max-lines-per-function
    public async bulkCreate(
        headers: BulkCreateSalesOrderPayload[],
        loggedUser: User
    ): Promise<CreationPayloadValidationResult> {
        const bulkCreateHeaders: SalesOrderHeaderModel[] = [];

        for (const headerObject of headers) {
            const productValidation = await this.validateProductsOnCreation(headerObject);
            if (productValidation.hasError) {
                return productValidation;
            }
            const items = this.getSalesOrderItems(headerObject, productValidation.products as ProductModel[]);
            const header = this.getSalesOrderHeader(headerObject, items);
            const customerValidation = await this.validateCustomerOnCreation(headerObject);
            if (customerValidation.hasError) {
                return customerValidation;
            }
            const headerValidationResult = header.validateCreationPayload({
                customer_id: (customerValidation.customer as CustomerModel).id
            });
            if (headerValidationResult.hasError) {
                return headerValidationResult;
            }
            bulkCreateHeaders.push(header);
        }

        await this.salesOrderHeaderRepository.bulkCreate(bulkCreateHeaders);
        await this.afterCreate(headers, loggedUser);

        return { hasError: false };
    }

    private async validateProductsOnCreation(
        header: SalesOrderHeader | BulkCreateSalesOrderPayload
    ): Promise<CreationPayloadValidationResult> {
        const products = await this.getProductsByIds(header);
        if (!products) {
            return { hasError: true, error: new Error('Products not found') };
        }
        return { hasError: false, products };
    }

    private async validateCustomerOnCreation(
        header: SalesOrderHeader | BulkCreateSalesOrderPayload
    ): Promise<CreationPayloadValidationResult> {
        const customer = await this.getCustomerById(header);
        if (!customer) {
            return { hasError: true, error: new Error('Customer not found') };
        }

        return { hasError: false, customer };
    }

    private async getProductsByIds(
        params: SalesOrderHeader | BulkCreateSalesOrderPayload
    ): Promise<ProductModel[] | null> {
        const productsIds: string[] = params.items?.map((item) => item.product_id) as string[];
        return this.productRepository.findByIds(productsIds);
    }

    private getSalesOrderItems(
        params: SalesOrderHeader | BulkCreateSalesOrderPayload,
        products: ProductModel[]
    ): SalesOrderItemModel[] {
        return params.items?.map((item) =>
            SalesOrderItemModel.create({
                price: item.price as number,
                productId: item.product_id as string,
                quantity: item.quantity as number,
                products
            })
        ) as SalesOrderItemModel[];
    }

    private getSalesOrderHeader(
        params: SalesOrderHeader | BulkCreateSalesOrderPayload,
        items: SalesOrderItemModel[]
    ): SalesOrderHeaderModel {
        return SalesOrderHeaderModel.create({
            customerId: params.customer_id as string,
            items
        });
    }

    private getExistingSalesOrderHeader(
        params: SalesOrderHeader | BulkCreateSalesOrderPayload,
        items: SalesOrderItemModel[]
    ): SalesOrderHeaderModel {
        return SalesOrderHeaderModel.with({
            id: params.id as string,
            customerId: params.customer_id as string,
            totalAmount: params.totalAmount as number,
            items
        });
    }

    private async getCustomerById(
        params: SalesOrderHeader | BulkCreateSalesOrderPayload
    ): Promise<CustomerModel | null> {
        const customerId = params.customer_id as string;
        return this.customerRepository.findById(customerId);
    }

    private getLoggedUser(loggedUser: User): LoggedUserModel {
        return LoggedUserModel.create({
            id: loggedUser.id,
            roles: loggedUser.roles as unknown as string[],
            attributes: {
                id: loggedUser.attr.id as unknown as number,
                groups: loggedUser.attr.groups as unknown as string[]
            }
        });
    }

    private getSalesOrderLog(salesOrderHeader: SalesOrderHeaderModel, user: LoggedUserModel): SalesOrderLogModel {
        return SalesOrderLogModel.create({
            headerId: salesOrderHeader.id,
            orderData: salesOrderHeader.toStringifiedObject(),
            userData: user.toStringifiedObject()
        });
    }
}
