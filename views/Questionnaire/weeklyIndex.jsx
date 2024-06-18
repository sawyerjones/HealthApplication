import {useEffect, useState} from 'react';
import Voice from '@react-native-voice/voice';
import TTS from 'react-native-tts';
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

  const TTS_STATES = {
    STARTED: 'STARTED',
    FINISHED: 'FINISHED',
    CANCELLED: 'CANCELLED',
  };

  const numbersInWords = {
    one: 1,
    to: 2,
    too: 2,
    two: 2,
    three: 3,
    four: 4,
    for: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
  };

  const VOICE_COMMANDS = {
    PREVIOUS_QUESTION: 'previous question',
    CANCEL_QUESTIONNAIRE: 'cancel questionnaire',
  };

  // RECORDING
  // const [isRecording, setIsRecording] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  // VOICE
  const [partialResults, setPartialResults] = useState('');

  // TTS
  const [ttsState, setTtsState] = useState();

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

  const stopRecording = () => {
    return Voice.stop();
  };

  const startRecording = () => {
    // setIsRecording(true);
    Voice.start('en-US');
    setTimeout(() => {
      stopRecording();
      // setIsRecording(false);
    }, 5000); // Stop the recording after 5 seconds
  };

  // VOICE HANDLERS
  function onSpeechStart(e) {
    console.log('onSpeechStart: ', e);
  }
  function onSpeechEnd(e) {
    console.log('onSpeechEnd: ', e);
  }
  function onSpeechPartialResults(e) {
    console.log('onSpeechPartialResults: ', e);
    const milis = new Date().getTime();
    // if (!isRecording) return; // Ignore results if not recording
    // console.log('onSpeechPartialResults: ', e);
  const result = e.value[0].toLowerCase();
  if (result.includes(VOICE_COMMANDS.PREVIOUS_QUESTION)) {
    goToPreviousQuestion();
  } else if (result.includes(VOICE_COMMANDS.CANCEL_QUESTIONNAIRE)) {
    cancelQuestionnaire();

  }
    setPartialResults(prevState => {
      // TODO:
      // HACK 3: LOCKING INPUT FROM VOICE IF WE HAVE DUPLICATE RESULTS FIRING. THIS IS CAUSED BY VOICE ENGINE GENERATING CONTEXT AND POTENTIALLY ALTERING THE SENTENCE
      // SOMETIMES ALTERATIONS IN THE RESULTS DO NOT HAPPEN AND THE SAME RESULT IS FIRED TWICE
      if (
        prevState &&
        e.value[0] === prevState.results[0] &&
        milis - prevState.collectedAt <= TIME_FOR_LOCK
      ) {
        // console.log(
        //   'returning',
        //   prevState,
        //   e.value[0] === prevState.results[0],
        //   milis - prevState.collectedAt <= 1000,
        // );
        return prevState;
      }

      // TODO:
      // HACK 2: check for case when For and Four are fired sequenctially (we transform the text of previous answer and current answer to numerical values and compare the two)
      if (prevState && milis - prevState.collectedAt <= TIME_FOR_LOCK) {
        const newText = e.value[0];
        const oldText = prevState.results[0];
        if (!oldText || !newText) return prevState;
        const newWords = newText.split(' ');
        const newNumber = newWords[newWords.length - 1].toLowerCase();
        const oldWords = oldText.split(' ');
        const oldNumber = oldWords[oldWords.length - 1].toLowerCase();
        if (
          numbersInWords[newNumber] &&
          numbersInWords[oldNumber] &&
          numbersInWords[newNumber] === numbersInWords[oldNumber]
        ) {
          return prevState;
        }
      }
      console.log('Setting new value: ', e.value);
      return {results: e.value, collectedAt: milis};
    });
  }

  function onSpeechError(e) {
    console.log('onSpeechError', e);
  }

  // TTS HANDLERS
  function ttsStartHandler(e) {
    console.log('TTS STARTED');
    setTtsState(TTS_STATES.STARTED);
  }

  function ttsFinishHandler(e) {
    console.log('TTS FINISHED: ', e);
    setTtsState(TTS_STATES.FINISHED);
  }

  function ttsCancelHandler(e) {
    console.log('TTS CANCELLED: ', e);
    setTtsState(TTS_STATES.CANCELLED);
  }

  useEffect(() => {
    // INIT FUNCTION
    async function init() {
      try {
        const ttsInitStatus = await TTS.getInitStatus();
        if (!ttsInitStatus) {
          throw new Error('TTS initialization Failed');
        }
        TTS.addEventListener('tts-start', ttsStartHandler);
        TTS.addEventListener('tts-finish', ttsFinishHandler);
        TTS.addEventListener('tts-cancel', ttsCancelHandler);
      } catch (error) {
        // TODO: HANDLE ERRORS IN TTS INITIALIZATION
        console.log('TTS INITIALIZATION ERROR', error);
      }
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;

      if (Platform.OS === 'android')
        Voice.onSpeechResults = onSpeechPartialResults;
      else Voice.onSpeechPartialResults = onSpeechPartialResults;
      Voice.onSpeechError = onSpeechError;

      try {
        const questions = await questionService.fetchQuestions();
        setQuestions(questions);
      } catch (error) {
        //TODO: HANDLE ERRORS WHEN QUESTIONS CAN NOT BE FETCHED
        console.log('QUESTION FETCH ERROR', error);
      }
    }
    init();

    return () => {
      if (Platform.OS === 'ios') {
        TTS.removeEventListener('tts-start', ttsStartHandler);
        TTS.removeEventListener('tts-finish', ttsFinishHandler);
        TTS.removeEventListener('tts-cancel', ttsCancelHandler);
      }
      TTS.stop().catch(error => console.log('TTS STOP FAILED', error));
      Voice.destroy().catch(error =>
        console.log('DESTORYING VOICE FAILED', error),
      );
    };
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
    try {
      await TTS.stop();
    } catch (error) {
      console.log('Error stopping TTS in goToPreviousQuestion', error);
    }

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
    try {
      await TTS.stop();
    } catch (error) {
      console.log('TTS stop failed at next question');
    }
    // if (isRecording) {
    //   await new Promise(resolve => setTimeout(resolve, 5000));
    // }
    if (qStatus.questionIdx + 1 >= questions.length) {
      return setQStatus(q => ({...q, state: QUESTIONNAIRE_STATES.LOADING}));
    }
    setQStatus(q => ({...q, questionIdx: q.questionIdx + 1}));
  };

  const selectAnswer = answer => {
    stopRecording().then(
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
      }),
    );
    setIsManualNavigation(false);
  };

  function getChoiceFromSpeech(text) {
    const match = text.match(/choice (\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

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
    try {
      await TTS.stop();
      await stopRecording();
    } catch (error) {
      console.error("Error cancelling TTS or Voice recording:", error);
    }
  
    setQStatus({
      state: QUESTIONNAIRE_STATES.BEFORE_STARTING,
      questionIdx: 0,
      answeredQuestions: [],
      externalData: {},
    });
  };

  const readQuestion = async () => {
    const {question, answers} = questions[qStatus.questionIdx];

    const text =
      'Question ' + (qStatus.questionIdx + 1) + ', ' + question + '; ';

    const ans = answers
      .map((ans, index) => {
        if (qStatus.questionIdx == 0) return index + 1 + ', ' + ans;
        return 'choice ' + (index + 1) + ', ';
      })
      .join();

    TTS.getInitStatus().then(() => {
      TTS.speak(text + ans);
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

  // READ QUESTION ON INDEX UPDATE
  useEffect(() => {
    if (qStatus.state !== QUESTIONNAIRE_STATES.STARTED) return;
    readQuestion();
  }, [qStatus.questionIdx]);

  // HANDLE PARTIAL RESULT CHANGES
  useEffect(() => {
    console.log('FIRED');
    if (qStatus.state === QUESTIONNAIRE_STATES.BEFORE_STARTING) return;

    const {answers} = questions[qStatus.questionIdx];

    const text = partialResults.results[0];
    if (!text) return;

    const choiceNumber = getChoiceFromSpeech(text);
    if (choiceNumber && choiceNumber <= answers.length) {
      console.log('FOUND FOUND FOUND via choice');
      selectAnswer(answers[choiceNumber - 1]);
      return;
    }

    const words = text.split(' ');
    const number = words[words.length - 1].toLowerCase();
    if (numbersInWords[number] && numbersInWords[number] <= answers.length) {
      // found.set(true);
      console.log('FOUND FOUND FOUND');
      selectAnswer(answers[numbersInWords[number] - 1]);
    } else {
      for (const text of partialResults.results) {
        for (const answ of answers) {
          console.log(answ);
          if (text.toLowerCase().includes(answ.toLowerCase())) {
            // found.set(true);
            console.log('FOUND FOUND FOUND');
            selectAnswer(answ);
            return;
          }
        }
      }
    }
  }, [partialResults.results]);

  // QUESTIONNAIRE STATE CHANGE
  useEffect(() => {
    if (qStatus.state == QUESTIONNAIRE_STATES.STARTED) {
      if (qStatus.questionIdx === 0) readQuestion();
    }

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

  useEffect(() => {
    if (ttsState === TTS_STATES.FINISHED) {
      const time = new Date().getTime();

      // TODO:
      // HACK 1: THIS IS NEEDED TO AVOID STARTING THE RECORDING IF WE MANUALLY SELECT THE ANSWER
      // TTS.FINISHED IS FIRED ON TTS.STOP as well as when TTS.SPEAK finishes talking
      if (time - qStatus.lastAnswerSet <= TIME_FOR_LOCK) return;
      console.log('STARTING RECORDING');
      startRecording();
    }
    if (ttsState === TTS_STATES.CANCELLED) {
      try {
        stopRecording();
      } catch (error) {
        console.log('STOP RECORDING FAILED AT TTS STATE');
      }
    }
  }, [ttsState]);

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
        <View style={{marginTop: 20}}>
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
