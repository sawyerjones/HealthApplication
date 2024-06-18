import RaynaudsAnswers from '../components/Questionnaires/RaynaudsQuestions.json';

class AnswerService {
  constructor() {
    this.answers = RaynaudsAnswers;
    this.initilized = true;
  }
  async fetchAnswers() {
    return Promise.resolve(this.answers);
  }

  getAnswers() {
    return this.Answers;
  }
}

export default RaynaudsAnswers;



/*FIRST: 
    - Add Weekly and Daily Questions as JSON files (done)
    - Add Button/Modal for which questionarre to select 
    - Add logic for each button press
    - Add skip logic for final queston on weekly

THEN:
    - Try to load answers in alongside questions

*/