const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
    coverageProvider: 'v8',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.sandcastle/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    collectCoverageFrom: [
        'app/api/**/*.ts',
        'lib/**/*.ts',
        '!lib/schema.ts',
        '!**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            lines: 60,
            functions: 60,
            branches: 50,
        },
    },
};

module.exports = createJestConfig(config);
