module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Allow inline styles alongside StyleSheet for one-off dynamic values.
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: ['node_modules/', 'android/', 'coverage/'],
};
