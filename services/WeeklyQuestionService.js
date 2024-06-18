import weeklyQuestions from '../components/Questionnaires/WuWeeklyQuestions.json'

class QuestionService {
  constructor() {
    this.questions = weeklyQuestions;
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