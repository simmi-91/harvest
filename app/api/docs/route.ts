import { NextResponse } from 'next/server';

const spec = {
    openapi: '3.0.0',
    info: {
        title: 'Harvest API',
        version: '3.0.0',
        description: 'API for tracking weekly harvest reports from Ulven Park samdyrkerlag',
    },
    paths: {
        '/api/plants': {
            get: {
                summary: 'Get all plants',
                tags: ['Plants'],
                responses: {
                    '200': { description: 'List of plants' },
                },
            },
            post: {
                summary: 'Create a plant',
                tags: ['Plants'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PlantInput' },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created plant' },
                    '400': { description: 'Validation error' },
                    '409': { description: 'Name already exists' },
                },
            },
        },
        '/api/plants/{id}': {
            get: {
                summary: 'Get a plant by id',
                tags: ['Plants'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Plant object' },
                    '404': { description: 'Not found' },
                },
            },
            put: {
                summary: 'Update a plant',
                tags: ['Plants'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Updated plant' },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                summary: 'Delete a plant',
                tags: ['Plants'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '204': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
        '/api/harvests': {
            get: {
                summary: 'Get harvests for a week',
                tags: ['Harvests'],
                parameters: [
                    { name: 'year', in: 'query', required: true, schema: { type: 'integer' } },
                    { name: 'week', in: 'query', required: true, schema: { type: 'integer' } },
                    { name: 'address', in: 'query', schema: { type: 'string' } },
                    { name: 'position', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    '200': { description: 'List of harvests with plant info and locations' },
                    '400': { description: 'Missing year or week' },
                },
            },
            post: {
                summary: 'Create a harvest',
                tags: ['Harvests'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/HarvestInput' },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created harvest' },
                    '400': { description: 'Validation error' },
                    '409': { description: 'Duplicate harvest' },
                },
            },
        },
        '/api/harvests/{id}': {
            get: {
                summary: 'Get a harvest by id',
                tags: ['Harvests'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Harvest with plant info and locations' },
                    '404': { description: 'Not found' },
                },
            },
            put: {
                summary: 'Update a harvest',
                tags: ['Harvests'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Updated harvest' },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                summary: 'Delete a harvest',
                tags: ['Harvests'],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '204': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
    },
    components: {
        schemas: {
            PlantInput: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    category: { type: 'string', enum: ['vegetable', 'herb', 'flower', 'seed'] },
                    harvest_instructions: { type: 'string', nullable: true },
                    tips: { type: 'string', nullable: true },
                    latin_name: { type: 'string', nullable: true },
                },
            },
            HarvestInput: {
                type: 'object',
                required: ['plant_id', 'year', 'week'],
                properties: {
                    plant_id: { type: 'integer' },
                    year: { type: 'integer' },
                    week: { type: 'integer' },
                    amount: { type: 'string', nullable: true },
                    harvest_note: { type: 'string', nullable: true },
                    is_new: { type: 'boolean' },
                    locations: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['address'],
                            properties: {
                                address: { type: 'string' },
                                position: { type: 'string', nullable: true },
                                boxes: { type: 'array', items: { type: 'integer' }, nullable: true },
                                location_note: { type: 'string', nullable: true },
                            },
                        },
                    },
                },
            },
        },
    },
};

export async function GET() {
    return NextResponse.json(spec);
}
