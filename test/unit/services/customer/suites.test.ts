import { describe, expect, it } from 'vitest';

import { Customer, Customers } from '@models/sales';

import { CustomerService, CustomerServiceImpl } from '@/services/customer';

type SutTypes = {
    sut: CustomerService;
};

const makeSut = (): SutTypes => {
    return { sut: new CustomerServiceImpl() };
};

const id = crypto.randomUUID();

const getCustomersWithoutEmail = (): Customer[] => [
    {
        id,
        firstName: 'Cuka',
        lastName: 'Roseti',
        email: ''
    }
];

const getCustomersWithFullEmail = (): Customer[] => [
    {
        id,
        firstName: 'Lucas',
        lastName: 'BTP',
        email: 'lucasbtp@email.com'
    }
];

const getCustomersWithEmailWithoutAt = (): Customer[] => [
    {
        id,
        firstName: 'Joao',
        lastName: 'Silva',
        email: 'joaosilva'
    }
];

describe('CustomerServiceImpl test cases', () => {
    it('should test if afterRead works even if the customers array is empty', () => {
        const { sut } = makeSut();
        const customers = [];
        const expectedResult = [];
        const result = sut.afterRead(customers);
        expect(result.value).toEqual(expectedResult);
    });
    it('should test if afterRead works even if the e-mail is undefined or empty', () => {
        const { sut } = makeSut();
        const customers = getCustomersWithoutEmail();
        const expectedResult: Customers = [{ id, firstName: 'Cuka', lastName: 'Roseti', email: '' }];
        const result = sut.afterRead(customers);
        expect(result.value).toEqual(expectedResult);
    });
    it('should test if afterRead does not changes the e-mail if a full e-mail is provided', () => {
        const { sut } = makeSut();
        const customers = getCustomersWithFullEmail();
        const expectedResult: Customers = [{ id, firstName: 'Lucas', lastName: 'BTP', email: 'lucasbtp@email.com' }];
        const result = sut.afterRead(customers);
        expect(result.value).toEqual(expectedResult);
    });
    it('should test if afterRead changes the e-mail if an e-mail without at is provided', () => {
        const { sut } = makeSut();
        const customers = getCustomersWithEmailWithoutAt();
        const expectedResult: Customers = [{ id, firstName: 'Joao', lastName: 'Silva', email: 'joaosilva@email.com' }];
        const result = sut.afterRead(customers);
        expect(result.value).toEqual(expectedResult);
    });
});
