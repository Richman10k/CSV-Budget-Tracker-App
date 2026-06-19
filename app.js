/**
 * app.js — application root. Wires up the provider stack:
 *   GestureHandlerRootView -> SafeAreaProvider -> PaperProvider (dark theme)
 *   -> AppDataProvider (state + lock) -> NavigationContainer -> RootNavigator
 */
import React from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {NavigationContainer} from '@react-navigation/native';

import {AppDataProvider} from './src/context/AppDataContext';
import RootNavigator from './src/navigation/RootNavigator';
import {paperTheme, navigationTheme, colors} from './src/theme/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.background}}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <AppDataProvider>
            <NavigationContainer theme={navigationTheme}>
              <StatusBar
                barStyle="light-content"
                backgroundColor={colors.background}
              />
              <RootNavigator />
            </NavigationContainer>
          </AppDataProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
