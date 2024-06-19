import {useEffect, useState} from 'react';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, Platform} from 'react-native';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Button, Divider, Text, LinearProgress} from '@rneui/themed';
import WeeklyQuestionService from '../../services/WeeklyQuestionService';
import { HttpStatusCode } from 'axios';
//import {AnswerService} from '../../services/AnswerService';
//import Icon from 'react-native-vector-icons/AntDesign';

export const WeeklyQuestionnaire = () => {
  const questionService = new WeeklyQuestionService();
  const TIME_FOR_LOCK = 1500;

  const QUESTIONNAIRE_STATES = {
    BEFORE_STARTING: 'BEFORE_STARTING',
    STARTED: 'START',
    LOADING: 'LOADING',
    FINISHED: 'FINISHED',
    SAVING: 'SAVING',
    SAVED: 'SAVED',
  };

  // RECORDING
  // const [isRecording, setIsRecording] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  // QUESTIONS
  const [questions, setQuestions] = useState([]);

  // QUESTIONAIRE STATUS
  const [qStatus, setQStatus] = useState({
    state: QUESTIONNAIRE_STATES.BEFORE_STARTING,
    questionIdx: 0,
    answeredQuestions: [],
    externalData: {},
    lastAnswerSet: 0,
    header: "",
  });

  useEffect(() => {
    // INIT FUNCTION
    async function init() {
      try {
        const questions = await questionService.fetchQuestions();
        setQuestions(questions);
      } catch (error) {
        //TODO: HANDLE ERRORS WHEN QUESTIONS CAN NOT BE FETCHED
        console.log('QUESTION FETCH ERROR', error);
      }
    }
    init();

    return () => {};
  }, []);

  const getWeather = async (lat, lon) => {
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=0bb2954984e58b4696605e92623b8626`,
    );
    const weatherData = await weatherResponse.json();
    return {
      city: weatherData.name,
      country: weatherData.sys.country,
      temperature: (((weatherData.main.temp - 273.15) * 9) / 5 + 32).toFixed(2),
      description: weatherData.weather[0].description,
    };
  };

  const fetchGeoLocation = async () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition((info, error) => {
        if (error) {
          return reject(error);
        }
        return resolve(info);
      });
    });
  };

  const getExternalInformation = async () => {
    let location = {},
      weather = {};
    try {
      location = await fetchGeoLocation();
    } catch (ex) {
      console.error('Could not fetch location', ex);
    }

    if (!location) return [location, weather];

    try {
      weather = await getWeather(
        location.coords.latitude,
        location.coords.longitude,
      );
    } catch (ex) {
      console.error('could not fetch weather', ex);
    }

    return [location, weather];
  };

  const goToPreviousQuestion = async () => {
    // Stop any ongoing recording or TTS
    setIsManualNavigation(true);

    setQStatus(q => {
      if (q.questionIdx === 0) return q; // Check to prevent index going below 0
      const newIdx = q.questionIdx - 1;
      const updatedAnsweredQuestions = q.answeredQuestions.slice(0, newIdx);
      return {
        ...q,
        questionIdx: newIdx,
        answeredQuestions: updatedAnsweredQuestions,
        state: QUESTIONNAIRE_STATES.STARTED, 
      };
    });
  };
  

  const nextQuestion = async () => {
    setIsManualNavigation(true);
    if (qStatus.questionIdx + 1 >= questions.length) {
      return setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.LOADING}));
    }
    setQStatus(q => ({...q, questionIdx: q.questionIdx + 1}));
  };

  const selectAnswer = answer => {
      setQStatus(q => {
        const lastAnswerSet = new Date().getTime();
        return {
          ...q,
          answeredQuestions: [
            ...q.answeredQuestions,
            {
              questionObj: questions[qStatus.questionIdx],
              patientAnswer: answer,
            },
          ],
          lastAnswerSet,
        };
      });
    setIsManualNavigation(false);
  };

  const startQuestionnaire = () => {
    return setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.STARTED}));
  };

  const restartQuestionnaire = () => {
    setQStatus({
      state: QUESTIONNAIRE_STATES.BEFORE_STARTING,
      questionIdx: 0,
      answeredQuestions: [],
      externalData: {},
    });
  };

  const cancelQuestionnaire = async () => {
    setQStatus({
      state: QUESTIONNAIRE_STATES.BEFORE_STARTING,
      questionIdx: 0,
      answeredQuestions: [],
      externalData: {},
    });
  };

  const saveData = async () => {
    // TODO: ADD LOADING
    const history = await AsyncStorage.getItem('history');
    const newHistory = history ? JSON.parse(history) : [];
    if (newHistory.length >= 50) {
      Alert.alert(
        'File Limit Reached',
        'You have reached the limit of stored records. If you save this data, the oldest record will be deleted.',
        [
          {
            text: 'Ok',
            onPress: async () => {
              setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.SAVING}));
              newHistory.shift(); // Remove the oldest questionnaire from the start
              newHistory.push({
                answeredQuestions: qStatus.answeredQuestions,
                externalData: qStatus.externalData,
              });
              await AsyncStorage.setItem('history', JSON.stringify(newHistory));
              setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.SAVED}));
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
    } else {
      setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.SAVING}));
      newHistory.push({
        answeredQuestions: qStatus.answeredQuestions,
        externalData: qStatus.externalData,
      });
      await AsyncStorage.setItem('history', JSON.stringify(newHistory));
      // TODO: NOTIFY SAVED
      setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.SAVED}));
    }
  };

  // CHECK CHAGES ON SAVED ANSWERED QUESTIONS
  useEffect(() => {
    if (qStatus.state === QUESTIONNAIRE_STATES.BEFORE_STARTING || isManualNavigation) {
    setIsManualNavigation(false);
    return;
  }
    nextQuestion();
  }, [qStatus.answeredQuestions]);

  // QUESTIONNAIRE STATE CHANGE
  useEffect(() => {
    if (qStatus.state == QUESTIONNAIRE_STATES.LOADING) {
      getExternalInformation().then(information => {
        const [location, weather] = information;
        const timestamp = new Date();
        setQStatus(q => ({
          ...q,
          externalData: {
            timestampLocale: timestamp.toLocaleString(),
            timestampUTC: timestamp.toISOString(),
            weather: weather,
            location: location,
          },
          state: QUESTIONNAIRE_STATES.FINISHED,
        }));
      });
    }
  }, [qStatus.state]);

  // UI LOGIC
  if (qStatus.state == QUESTIONNAIRE_STATES.BEFORE_STARTING) {
    return (
      <View style={styles.containerStart}>
        <View style={styles.constainerInstructions}>
          <Text
            h3
            style={{
              marginBottom: 10,
              color: '#4388d6',
            }}>
            Instructions
          </Text>
          <Text style={{marginBottom: 5, fontSize: 16}}>
            The Questionnaire consists of multiple multi-choice questions.
          </Text>
          <Text style={{marginBottom: 5, fontSize: 16}}>
            If you are using an Android phone with the device's voice acess on please TURN VOICE ACCESS OFF
            while completing the questionnaire. 
          </Text>
          <Text style={{marginBottom: 5, fontSize: 16}}>
            For this survey, cold foods are defined as foods below room temperature,
            such as cold salads, cold sandwiches, and sushi. Hot foods are defined as foods at or above 86 to 104°F
            (30-40°C), such as warm sandwiches, warm rice dishes with cooked vegetables, and warm soups.
          </Text>
          <Text style={{marginBottom: 5, fontSize:16}}>
            Additionally, please refer to this key to diagnose your symptoms:
            {"\n"}Mild = symptom did not interfere with usual activities.
            {"\n"}Moderate = symptom interfered somewhat with usual activities.
            {"\n"}Severe = symptom was so bothersome that usual activities could not be performed.
          </Text>
          <Text style={{marginBottom: 5, fontSize: 16}}>
            After going though the questionnaire you can save your answers and
            view them in the history page or restart the questionnaire from the
            beginning.
          </Text>
          
          <Text style={{fontSize: 16}}>
            Press the <Text style={{color: '#4388d6'}}>blue</Text> button below to
            start the questionnaire
          </Text>
        </View>
        <View>
          <Button
            title="Begin"
            size="lg"
            titleStyle={{
              color: 'white',
              fontSize: 25,
              fontWeight: 'bold',
            }}
            containerStyle={{
              borderRadius: 30,
              width: 300,
            }}
            onPress={startQuestionnaire}
          />
        </View>
      </View>
    );
  }

  if (qStatus.state == QUESTIONNAIRE_STATES.STARTED) {
    return (
      <View style={styles.containerQuestionnaire}>
        <View style={styles.containerQuestion}>
    
        <Text
            h3
            style={{
              marginBottom: 10,
              color: '#4388d6',
            }}>
            Question {qStatus.questionIdx + 1}
          </Text>
        <Text style={{
            fontSize: 20,
            fontWeight: 700,
          }}>
            {questions[qStatus.questionIdx].header}
          </Text>
          
          <Text style={{fontSize: 20}}>
            {"\n"}{questions[qStatus.questionIdx].question}{"\n"}
          </Text>
        </View>
        <ScrollView>
        <View accessible={Platform.OS === 'android' ? true : false}>
          {questions[qStatus.questionIdx].answers.map((ans, answerIndex) => {
            return (
              <Button
                title={`${ans}`}
                accessible={Platform.OS === 'android' ? true : false}
               
                titleStyle={{
                  color: 'white',
                  fontSize: 25,
                  fontWeight: 'bold',
                }}
                containerStyle={{
                  borderRadius: 10,
                  width: 300,
                  marginBottom: 10,
                }}
                key={`${questions[qStatus.questionIdx].id}-${ans}`}
                onPress={() => selectAnswer(ans)}
              />
            );
          })}
        </View>
        </ScrollView>

        {qStatus.questionIdx > 0 && (
        <View style={{marginTop: 10}}>
          <Button
            title="Previous Question"
            buttonStyle={{
              borderWidth: 1,
              borderColor: '#4388d6',
              borderRadius: 10,
              backgroundColor: '#ffffff',         
            }}
            titleStyle={{
              color: '#4388d6',
              fontSize: 20,
            }}
            onPress={goToPreviousQuestion}
          />
        </View>
      )}
        <View style={{marginTop: 20, marginBottom: 40}}>
          <Button
            title="Cancel Questionnaire"
            buttonStyle={{
              borderWidth: 1,
              borderColor: '#ff0000',
              borderRadius: 10,
              backgroundColor: '#ffffff',
            }}
            titleStyle={{
              color: '#ff0000',
              fontSize: 20,
            }}
            onPress={cancelQuestionnaire}
          />
        </View>
      </View>
    );
  }

  if (qStatus.state == QUESTIONNAIRE_STATES.LOADING) {
    if (
      qStatus.questionIdx != 0 &&
      qStatus.questionIdx + 1 === questions.length
    ) {
      return (
        <View style={styles.containerResults}>
          <Text h3 style={{color: '#4388d6', marginBottom: 12}}>
            Collecting Results...
          </Text>
          <LinearProgress
            color="primary"
            animation={{duration: 700}}
            value={1}
          />
        </View>
      );
    }
  }

  if (qStatus.state == QUESTIONNAIRE_STATES.SAVING) {
    return (
      <View style={styles.containerResults}>
        <Text h3 style={{color: '#4388d6', marginBottom: 12}}>
          Saving...
        </Text>
        <LinearProgress color="primary" animation={{duration: 700}} value={1} />
      </View>
    );
  }

  if (qStatus.state == QUESTIONNAIRE_STATES.SAVED) {
    return (
      <View style={styles.containerSaved}>
        <Text style={{color: '#4ec747', fontSize: 50}}>Saved</Text>
      </View>

      // <View></View>
    );
  }

  if (qStatus.state == QUESTIONNAIRE_STATES.FINISHED) {
    return (
      <ScrollView>
        <View style={styles.containerResults}>
          <View>
            <View style={{marginBottom: 15}}>
              <Text style={{fontSize: 20, color: '#4388d6'}}>
                {' '}
                Timestamp:{' '}
                <Text style={{fontSize: 15}}>
                  {qStatus.externalData.timestampLocale}
                </Text>
              </Text>
            </View>
            <View style={{marginBottom: 15}}>
              <Text style={{fontSize: 20, color: '#4388d6'}}>
                {' '}
                Location:{' '}
                <Text style={{fontSize: 15}}>
                  {qStatus.externalData.weather.city},{' '}
                  {qStatus.externalData.weather.country}
                </Text>
              </Text>
            </View>
            <View style={{marginBottom: 15}}>
              <Text style={{fontSize: 20, color: '#4388d6'}}>
                {' '}
                Weather:{' '}
                <Text style={{fontSize: 15, textTransform: 'capitalize'}}>
                  {qStatus.externalData.weather.description}{' '}
                </Text>
              </Text>
            </View>
            <View style={{marginBottom: 15}}>
              <Text style={{fontSize: 20, color: '#4388d6'}}>
                {' '}
                Temperature:{' '}
                <Text style={{fontSize: 15}}>
                  {' '}
                  {qStatus.externalData.weather.temperature} °F{' '}
                </Text>
              </Text>
            </View>
          </View>

          {qStatus.answeredQuestions.map((q, qIdx) => {
            return (
              <View key={`${q.questionObj.question}-${q.patientAnswer}`}>
                <View style={{marginBottom: 15}}>
                  <Text h3 style={{color: '#4388d6', marginBottom: 12}}>
                    Question {qIdx + 1}
                  </Text>
                  <Text style={{fontSize: 20, marginBottom: 5}}>
                    {q.questionObj.question}
                  </Text>
                  <Text style={{fontSize: 25, color: '#4388d6'}}>
                    Answer:{' '}
                    <Text style={{fontSize: 20}}>{q.patientAnswer}</Text>
                  </Text>
                </View>
                <Divider
                  inset={true}
                  insetType="middle"
                  style={{marginBottom: 15}}
                />
              </View>
            );
          })}

          <View style={styles.constinerResultsButtons}>
            <Button
              title={'Save'}
              buttonStyle={{
                borderWidth: 2,
                borderColor: '#4388d6',
                borderRadius: 10,
              }}
              titleStyle={{
                color: 'white',
                fontSize: 25,
                width: 120,
                fontWeight: 'bold',
              }}
              onPress={() => saveData()}
            />

            <Button
              title={'Restart'}
              buttonStyle={{
                borderWidth: 2,
                borderColor: '#4388d6',
                borderRadius: 10,
              }}
              titleStyle={{
                color: '#4388d6',
                fontSize: 25,
                width: 120,
                fontWeight: 'bold',
              }}
              type="outline"
              onPress={restartQuestionnaire}
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  return <View></View>;
};

const styles = StyleSheet.create({
  containerStart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: '100%',
  },

  constainerInstructions: {
    marginHorizontal: 25,
  },

  containerStartButton: {},

  containerQuestionnaire: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  containerQuestion: {
    paddingHorizontal: 25,
  },

  containerResults: {
    marginVertical: 30,
    marginHorizontal: 15,
  },
  containerSaved: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    marginTop: 50,
  },

  constinerResultsButtons: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 10,
  },
});
