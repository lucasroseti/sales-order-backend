import { Either, left, right } from '@sweet-monads/either';

import { ExpectedResult as SalesReportByDays } from '@models/db/types/SalesReport';

import { SalesReportRepository } from '@/repositories/sales-report/protocols';
import { SalesReportService } from '@/services/sales-report/protocols';
import { AbstractError, NotFoundError, ServerError } from '@/errors';

export class SalesReportServiceImpl implements SalesReportService {
    constructor(private readonly repository: SalesReportRepository) {}

    public async findByDays(days = 7): Promise<Either<AbstractError, SalesReportByDays[]>> {
        try {
            const reportData = await this.repository.findByDays(days);
            if (!reportData) {
                const stack = new Error().stack as string;
                return left(new NotFoundError('Sales report not found', stack));
            }
            const mappedData = reportData.map((report) => report.toObject());
            return right(mappedData);
        } catch (error) {
            const errorInstance = error as Error;
            return left(new ServerError(errorInstance.stack as string, errorInstance.message));
        }
    }

    public async findByCustomerId(customerId: string): Promise<Either<AbstractError, SalesReportByDays[]>> {
        try {
            const reportData = await this.repository.findByCustomerId(customerId);
            if (!reportData) {
                const stack = new Error().stack as string;
                return left(new NotFoundError('Sales report not found', stack));
            }
            const mappedData = reportData.map((report) => report.toObject());
            return right(mappedData);
        } catch (error) {
            const errorInstance = error as Error;
            return left(new ServerError(errorInstance.stack as string, errorInstance.message));
        }
    }
}
