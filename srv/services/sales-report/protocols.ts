import { Either } from '@sweet-monads/either';

import { AbstractError } from '@/errors';
import { ExpectedResult as SalesReportByDays } from '@models/db/types/SalesReport';

export interface SalesReportService {
    findByDays(days?: number): Promise<Either<AbstractError, SalesReportByDays[]>>;
    findByCustomerId(customerId: string): Promise<Either<AbstractError, SalesReportByDays[]>>;
}
