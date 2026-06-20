/**
 * BudgetDashboard.js — the main authenticated experience: a 5-tab bottom
 * navigator (custom animated TabBar). The Subscriptions tab is itself a stack
 * so it can push the SubscriptionDetail screen.
 */
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';

import TabBar from '../components/TabBar';
import HomeTab from '../tabs/HomeTab';
import TransactionsTab from '../tabs/TransactionsTab';
import SubscriptionsTab from '../tabs/SubscriptionsTab';
import BudgetTab from '../tabs/BudgetTab';
import SettingsTab from '../tabs/SettingsTab';
import SubscriptionDetail from '../subscriptions/SubscriptionDetail';

const Tab = createBottomTabNavigator();
const SubStack = createStackNavigator();

/** Subscriptions tab = list -> detail stack. */
function SubscriptionsStack() {
  return (
    <SubStack.Navigator screenOptions={{headerShown: false}}>
      <SubStack.Screen name="SubscriptionsHome" component={SubscriptionsTab} />
      <SubStack.Screen name="SubscriptionDetail" component={SubscriptionDetail} />
    </SubStack.Navigator>
  );
}

export default function BudgetDashboard() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        // Quick cross-tab transition (slide + fade) instead of an instant cut.
        animation: 'shift',
        transitionSpec: {
          animation: 'timing',
          config: {duration: 220},
        },
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
