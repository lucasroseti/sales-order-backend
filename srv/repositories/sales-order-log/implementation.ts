import cds from '@sap/cds';

import { SalesOrderLogRepository } from './protocols';
import { SalesOrderLogModel } from 'srv/models/sales-order-log';

export class SalesOrderLogRepositoryImpl implements SalesOrderLogRepository {
    public async create(logs: SalesOrderLogModel[]): Promise<void> {
        const logsObjects = logs.map((log) => log.toObject());
        await cds.create('sales.SalesOrderLogs').entries(logsObjects);
    }
}