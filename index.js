/**
 * index.js — React Native entry point.
 * react-native-gesture-handler MUST be imported before anything else.
 */
import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './app';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
