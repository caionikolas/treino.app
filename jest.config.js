module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.mp4$': '<rootDir>/__mocks__/mp4Mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/)?(@?)(jest-)?react-native(.*)?|@react-navigation|react-native-uuid)',
  ],
};
