const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
    coverageProvider: 'v8',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
};

module.exports = createJestConfig(config);
