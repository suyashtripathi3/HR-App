// Phase 1 navigation skeleton: Home, History, Add, Insights, Profile.
// Screens are placeholders until Phase 2+ builds them feature by feature.
// This file is wired up when the React Native CLI project is initialised
// locally (see mobile/README.md) — it is not an Expo app.
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>HisabRakho</Text>
      <Text>Phase 1 — foundation. Tabs: Home, History, Add, Insights, Profile.</Text>
    </View>
  );
}
