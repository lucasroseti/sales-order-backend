using { sales } from '../../db/schema.cds';
using { db.types.SalesReportByDays } from '../../db/types';

@requires: 'authenticated-user'
// Entities
service MainService {
    entity SalesOrderHeaders as projection on sales.SalesOrderHeaders;
    entity SalesOrderStatuses as projection on sales.SalesOrderStatuses;
    entity Customers as projection on sales.Customers;
    entity Products as projection on sales.Products;
}

// Functions
extend service MainService with {
    function getSalesReportByDays(days: SalesReportByDays.Params:days) returns array of SalesReportByDays.ExpectedResult;
}