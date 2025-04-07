using { sales } from '../db/schema.cds';

service MainService {
    entity SalesOrderHeaders as projection on sales.SalesOrderHeaders;
}