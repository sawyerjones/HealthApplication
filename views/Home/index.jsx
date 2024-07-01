import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Linking,
  Modal,
} from 'react-native';
import {
  initiateFitbitAuth,
  handleOpenURL,
} from '../../components/Fitbit/index.js';
import React, {useEffect, useState} from 'react';
import { connectToIOSWatch } from '../../components/iOSWatch/index.js';

// import AntIcon from 'react-native-vector-icons/AntDesign';
// import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import { useNavigation } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const Home = () => {
  const navigation = useNavigation();

  useEffect(() => {
    Linking.addEventListener('url', handleOpenURL);

    const tryReconnect = async () => {
      try {
        const storedPeripheralId = await AsyncStorage.getItem('connectedPeripheralId');
        if (storedPeripheralId) {
          BleManager.connect(storedPeripheralId)
            .then(() => {
              console.log('Reconnected to ' + storedPeripheralId);
            })
            .catch(error => {
              // console.error('Connection attempt failed', error);
            });
        }
      } catch (error) {
        console.error('Error in tryReconnect:', error);
      }
    };

    tryReconnect();

    return () => {
      Linking.removeEventListener('url', handleOpenURL);
    };
  }, []);
  const navigate = location => {
    navigation.push(location);
  };

  useEffect(() => {
    Linking.addEventListener('url', handleOpenURL);
  }, []);
  // useEffect(() => {
  //   const handleOpenURL = (event) => {
  //   console.log('Received URL:', event.url);
  //   };
  //   Linking.addEventListener('url', handleOpenURL);
  //   return () => {
  //     Linking.removeEventListener('url', handleOpenURL);
  //   };
  // }, []);
const [modalVisible, setModalVisible] = useState(false);
  return (
    <SafeAreaView>
      <View style={styles.titleContainer}>
        {/* <MaterialIcon name="health-and-safety" size={100} color="#85cffe" /> */}
        <Text style={styles.title}>{'HealthApp'}</Text>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          accessible={true}
          accessibilityLabel="Questionnaire"
          accessibilityHint="Navigate To History Page"
          onPress={() => navigate('Questionnaire')}
          style={{
            ...styles.navigationButton,
            ...styles.navigationButtonQuestionnaire,
          }}>
          {/* <AntIcon name="questioncircleo" size={30} color="white"></AntIcon> */}
          <Text accessible={false} style={styles.navigationButtonText}>
            Questionnaire
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessible={true}
          accessibilityLabel="History"
          accessibilityHint="Navigate To History Page"
          onPress={() => navigate('History')}
          style={{
            ...styles.navigationButton,
            ...styles.navigationButtonHistory,
          }}>
          {/* <AntIcon name="filetext1" size={30} color="white"></AntIcon> */}
          <Text accessible={false} style={styles.navigationButtonText}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accesible={true}
          accessibilityLabel="Connect to Device"
          accessibilityHint="Initiate Connection to Device"
          onPress={() => setModalVisible(true)}
          style={{
            ...styles.navigationButton,
            ...styles.navigationButtonFitbit,
          }}>
            <Modal
              animationType="fade"
              transparent ={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}>
              <View style={styles.modalContianer}>
                <TouchableOpacity
                  accessible={true}
                  accessibilityLabel="Connect to Fitbit"
                  accessibilityHint="Initiate Fitbit Authentication"
                  onPress={initiateFitbitAuth}
                  onPressOut={() => setModalVisible(false)}
                  style={{
                    ...styles.navigationButton,
                    ...styles.navigationButtonFitbit,
                  }}>
                    <Text accessible={false} style={styles.navigationButtonText}>
                      Connect to Fitbit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessible={true}
                  accessibilityLabel="Connect to iOS Watch"
                  accessibilityHint="Initiate iOS Watch Connection"
                  onPress={connectToIOSWatch}
                  onPressOut={() => setModalVisible(false)}
                  style={{
                    ...styles.navigationButton,
                   ...styles.navigationButtoniOSWatch
                   }}>
                  <Text accessible={false} style={styles.navigationButtonText}>
                    Connect to iOS Watch
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessible={true}
                  accessibilityLabel="Cancel"
                  accessibilityHint="Cancel"
                  onPressOut={() => setModalVisible(false)}
                  style={{
                    ...styles.navigationButton,
                    ...styles.navigationButtonFitbit,
                  }}>
                    <Text accessible={false} style={styles.navigationButtonText}>
                      Cancel
                  </Text>
                </TouchableOpacity>
                </View>
                </Modal>
              <Text accessible={false} style={styles.navigationButtonText}>
                Connect to Device
              </Text>
            </TouchableOpacity>
        <TouchableOpacity
          accessible={true}
          accessibilityLabel="Connect to Sensor"
          accessibilityHint="Manage Sensor Connection"
          onPress={() => navigate('BluetoothConnect')}
          style={{
            ...styles.navigationButton,
            ...styles.navigationButtonBluetooth,
          }}>
          <Text accessible={false} style={styles.navigationButtonText}>
             Connect to Bluetooth
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 50,
  },

  title: {
    color: '#85cffe',
    fontSize: 50,
    fontWeight: 'bold',
  },

  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 60,
  },

  navigationButton: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    width: 300,
    height: 100,
    marginVertical: 10,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  navigationButtonHistory: {
    backgroundColor: '#4388d6',
  },
  navigationButtonQuestionnaire: {
    backgroundColor: '#4388d6',
  },
  navigationButtonFitbit: {
    backgroundColor: '#4388d6',
  },
  navigationButtoniOSWatch: {
    backgroundColor: '#4388d6',
  },
  navigationButtonBluetooth: {
    backgroundColor: '#4388d6',
  },
  modalContianer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,.75)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
