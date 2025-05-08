import { AbstractError } from '@/errors';

export class NotFoundError extends AbstractError {
    constructor(message: string, stack: string) {
        super(message, 404, stack);
    }

    public get message() {
        return this.message;
    }
}
