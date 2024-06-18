import React from 'react';
import {Home} from './views/Home';
import {History} from './views/History';
import {RecordView} from './views/RecordView';
import {Questionnaire} from './views/Questionnaire/index';
import {WeeklyQuestionnaire} from './views/Questionnaire/weeklyIndex'
import {Header} from './components/Header';
import {NavigationContainer} from '@react-navigation/native';
import {StyleSheet} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';

const Stack = createStackNavigator();

function App() {
  const NAVIGATOR_OPTIONS = {initialRouteName: 'Home', header: Header};
  const HOME_NAVIGATION_OPTIONS = {headerShown: false};

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={NAVIGATOR_OPTIONS}>
        <Stack.Screen
          name="Home"
          options={HOME_NAVIGATION_OPTIONS}
          component={Home}
        />
        <Stack.Screen name="History" component={History} />
        <Stack.Screen name="Questionnaire" component={Questionnaire} />
        <Stack.Screen name = "WeeklyQuestionnaire" component={WeeklyQuestionnaire} />
        <Stack.Screen name="RecordView" component={RecordView} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});

export default App;
