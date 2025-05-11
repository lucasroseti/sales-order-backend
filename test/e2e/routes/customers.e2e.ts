/* eslint-disable max-lines-per-function */
import { api } from '../config/api';

describe('Customers routes', () => {
    describe('afterRead Customers', () => {
        it('should get all customers with @email.com', async () => {
            const { data, status } = await api.get('/sales-order/Customers');
            const { value: customers } = data;
            expect(status).toBe(200);
            expect(customers.length).toBe(10);
            expect(customers).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '48678748-1c02-4712-9cf3-808ccae903c8',
                        firstName: 'firstName-4867874',
                        lastName: 'lastName-4867874',
                        email: 'email-4867874@email.com'
                    })
                ])
            );
        });
        it('should return at least one e-mail with @gmail.com', async () => {
            const { data, status } = await api.get('/sales-order/Customers');
            const { value: customers } = data;
            expect(status).toBe(200);
            expect(customers.length).toBe(10);
            expect(customers).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '48678668-5802-4e91-8df1-2730ebe100e9',
                        firstName: 'firstName-4867866',
                        lastName: 'lastName-4867866',
                        email: 'email-4867866@gmail.com'
                    })
                ])
            );
        });
    });
});
