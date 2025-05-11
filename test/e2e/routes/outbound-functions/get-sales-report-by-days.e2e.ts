import { api } from '@tests/e2e/config/api';

describe('GetSalesReportByDays route', () => {
    it('should return 404 if no records were found', async () => {
        await expect(api.get('/sales-order/getSalesReportByDays()')).rejects.toThrow('Sales report not found');
    });
    it('should return report data with status 200 if everything worked as expected', async () => {
        const { data, status } = await api.get('/sales-order/getSalesReportByDays(days=20)');
        const { value: report } = data;
        expect(status).toBe(200);
        expect(report).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    salesOrderId: '1613729e-006e-4a2e-9da8-6c436c6be4de',
                    salesOrderTotalAmount: 12698954.17,
                    customerId: '59400570-3e16-400d-8f93-5f7effc7a366',
                    customerFullName: 'firstName-5940057 lastName-5940057'
                })
            ])
        );
    });
});
