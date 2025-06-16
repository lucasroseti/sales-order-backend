import type { Application } from 'express';
import cds from '@sap/cds';
import promClient from 'prom-client';

function setupRequestCounter(register: promClient.Registry) {
    return new promClient.Counter({
        name: 'http_requests_total',
        help: 'Total de requisições HTTP',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register]
    });
}

function setupRequestDuration(register: promClient.Registry) {
    return new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duração das requisições HTTP em segundos',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
        registers: [register]
    });
}

function setupErrorCounter(register: promClient.Registry) {
    return new promClient.Counter({
        name: 'http_error_total',
        help: 'Total de erros HTTP',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register]
    });
}

function setupSalesOrderCreatedCounter(register: promClient.Registry) {
    return new promClient.Counter({
        name: 'sales_order_created_total',
        help: 'Total de pedidos de venda criados',
        registers: [register]
    });
}

function setupCategorizedErrorCounter(register: promClient.Registry) {
    return new promClient.Counter({
        name: 'categorized_error_total',
        help: 'Total de erros categorizados registrados no log',
        labelNames: ['category'],
        registers: [register]
    });
}

function prometheusMiddleware(
    httpRequestCounter: promClient.Counter,
    httpRequestDuration: promClient.Histogram,
    httpErrorCounter: promClient.Counter
) {
    return (req, res, next) => {
        const end = httpRequestDuration.startTimer({
            method: req.method,
            route: req.route ? req.route.path : req.path
        });
        res.on('finish', () => {
            httpRequestCounter.inc({
                method: req.method,
                route: req.route ? req.route.path : req.path,
                status_code: res.statusCode
            });
            end({ status_code: res.statusCode });
            if (res.statusCode >= 400) {
                httpErrorCounter.inc({
                    method: req.method,
                    route: req.route ? req.route.path : req.path,
                    status_code: res.statusCode
                });
            }
        });
        next();
    };
}

function prometheusEndpoint(register: promClient.Registry) {
    return async (_req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    };
}

function logCategorizedErrorFactory(counter: promClient.Counter) {
    return (category: string, ...args: unknown[]) => {
        counter.inc({ category });
        // Loga no console também
        console.error(`[${category}]`, ...args);
    };
}

function setupPrometheus(app: Application) {
    const register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register });
    const httpRequestCounter = setupRequestCounter(register);
    const httpRequestDuration = setupRequestDuration(register);
    const httpErrorCounter = setupErrorCounter(register);
    const salesOrderCreated = setupSalesOrderCreatedCounter(register);
    const categorizedErrorCounter = setupCategorizedErrorCounter(register);

    app.use(prometheusMiddleware(httpRequestCounter, httpRequestDuration, httpErrorCounter));

    // Middleware de CORS para /metrics
    app.use('/metrics', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    app.get('/metrics', prometheusEndpoint(register));
    app.set('salesOrderCreatedMetric', salesOrderCreated);
    app.set('categorizedErrorCounter', categorizedErrorCounter);
    app.set('logCategorizedError', logCategorizedErrorFactory(categorizedErrorCounter));
}

cds.on('bootstrap', (app: Application) => {
    setupPrometheus(app);
});

export = cds.server;
