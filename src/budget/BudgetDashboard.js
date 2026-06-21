/**
 * BudgetDashboard.js — the main authenticated experience: a 5-tab bottom
 * navigator (custom animated TabBar). The Subscriptions tab is itself a stack
 * so it can push the SubscriptionDetail screen.
 */
import React from 'react';
import {Easing} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';

import TabBar from '../components/TabBar';
import HomeTab from '../tabs/HomeTab';
import TransactionsTab from '../tabs/TransactionsTab';
import SubscriptionsTab from '../tabs/SubscriptionsTab';
import BudgetTab from '../tabs/BudgetTab';
import SettingsTab from '../tabs/SettingsTab';
import SubscriptionDetail from '../subscriptions/SubscriptionDetail';
import CashFlowScreen from '../automations/CashFlowScreen';

const Tab = createBottomTabNavigator();
const SubStack = createStackNavigator();

// Snappy, native-driven horizontal slide for pushing detail / cash-flow.
const STACK_TRANSITION = {
  gestureEnabled: true,
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: {
    open: {animation: 'timing', config: {duration: 240, easing: Easing.out(Easing.cubic)}},
    close: {animation: 'timing', config: {duration: 200, easing: Easing.in(Easing.cubic)}},
  },
};

/** Subscriptions tab = list -> detail / cash-flow stack. */
function SubscriptionsStack() {
  return (
    <SubStack.Navigator
      screenOptions={{headerShown: false, ...STACK_TRANSITION}}>
      <SubStack.Screen name="SubscriptionsHome" component={SubscriptionsTab} />
      <SubStack.Screen name="SubscriptionDetail" component={SubscriptionDetail} />
      <SubStack.Screen name="CashFlow" component={CashFlowScreen} />
    </SubStack.Navigator>
  );
}

export default function BudgetDashboard() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Pre-mount screens and switch instantly so a screen opened from the FAB
        // (Budget / Subscriptions) appears fully formed at once — no fade/lazy
        // reveal that looks like it's "opening weird".
        lazy: false,
        animation: 'none',
      }}
      tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsStack} />
      <Tab.Screen name="Transactions" component={TransactionsTab} />
      <Tab.Screen name="Budget" component={BudgetTab} />
      <Tab.Screen name="Settings" component={SettingsTab} />
    </Tab.Navigator>
  );
}
