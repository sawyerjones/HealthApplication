import dailyQuestions from '../components/Questionnaires/WuDailyQuestions.json'

class QuestionService {
  constructor() {
    this.questions = dailyQuestions;
    this.initilized = true;
  }
  async fetchQuestions() {
    return Promise.resolve(this.questions);
  }

  getQuestions() {
    return this.questions;
  }
}

export default QuestionService;
