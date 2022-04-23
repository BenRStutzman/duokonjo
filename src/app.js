import React from 'react';
import verbsFile from './vocab.txt';
import correctSoundFile from './sounds/correct.wav';
import incorrectSoundFile from './sounds/incorrect.wav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeMute, faVolumeUp, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons'

const correctSound = new Audio(correctSoundFile);
const incorrectSound = new Audio(incorrectSoundFile);
const incorrectAnswerRetryInterval = 5;
const correctMessageDisplayTimeSeconds = 2;

const InputBox = (props) => (
  <input id="input" value={props.value} autoComplete="off" spellCheck="false" autoFocus
    onChange={props.handleChange}
    onKeyPress={props.handleKeyPress}/>
);

const defaultState = {
  languages: null,
  language: null,
  languageInfo: null,
  categories: null,
  phase: 'loading',
  problemQueue: [],
  problems: [],
  currentProblem: null,
  mistakesOnCurrentProblem: 0,
  input: '',
  correctMessage: {
    isCorrect: false,
    message: '',
  },
  correctMessageTimeoutId: null,
  numberOfProblems: 0,
  numberCorrect: 0,
  muted: false,
};

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = defaultState;

    this.checkAnswer = this.checkAnswer.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.clearCorrectMessage = this.clearCorrectMessage.bind(this);
    this.begin = this.begin.bind(this);
    this.chooseLanguage = this.chooseLanguage.bind(this);
    this.restart = this.restart.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
  }

  async componentDidMount() {
    const languages = {};
    let info;
    let categorySets;
    let language;
    let writeThisIn;
    let english;
    let correctMessages;
    let incorrectMessages;
    let tryMessage;
    let orMessage;
    let allWord;
    let category;
    let englishPhrases;
    let vocabPairs;
    let targetLanguagePhrases;

    var text = await fetch(verbsFile)
      .then(result => result.text());

    const languageSets = text.trim().split(/\s*\n\s*\n\s*\n\s*/);
    languageSets.forEach(languageSet => {
      [info, ...categorySets] = languageSet.split(/\s*\n\s*\n\s*/);
      [language, english, allWord, writeThisIn, correctMessages, incorrectMessages, tryMessage, orMessage] = info.split(/\s*\n\s*/);
      languages[language] = {
        writeThisIn: writeThisIn.split(/:\s*/)[1],
        english: english.split(/:\s*/)[1],
        correctMessages: correctMessages.split(/:\s*/)[1].split('/'),
        incorrectMessages: incorrectMessages.split(/:\s*/)[1].split('/'),
        tryMessage: tryMessage.split(/:\s*/)[1],
        orMessage: orMessage.split(/:\s*/)[1],
        allWord: allWord.split(/:\s*/)[1],
        categories: [],
        problems: [],
      };
      categorySets.forEach(categorySet => {
        [category, ...vocabPairs] = categorySet.split(/\s*\n\s*/);
        languages[language].categories.push(category);
        vocabPairs.forEach(vocabPair => {
          [englishPhrases, targetLanguagePhrases] = vocabPair.split(/:\s+/)
            .map(phrases => phrases.split('/'));
          englishPhrases.forEach(phrase => {
            const existingProblem = languages[language].problems
              .find(problem => !problem.toEnglish && problem.question === phrase)
            if (existingProblem) {
              existingProblem.answers = [...existingProblem.answers, ...targetLanguagePhrases]
              if (!existingProblem.categories.includes(category)) {
                existingProblem.categories.push(category);
              }
            } else {
              languages[language].problems.push({
                question: phrase,
                answers: targetLanguagePhrases,
                categories: [category],
                toEnglish: false,
              });
            }
          });
          targetLanguagePhrases.forEach(phrase => {
            const existingProblem = languages[language].problems
              .find(problem => problem.toEnglish && problem.question === phrase)
            if (existingProblem) {
              existingProblem.answers = [...existingProblem.answers, ...englishPhrases]
              if (!existingProblem.categories.includes(category)) {
                existingProblem.categories.push(category);
              }
            } else {
              languages[language].problems.push({
                question: phrase,
                answers: englishPhrases,
                categories: [category],
                toEnglish: true,
              });
            }
          });
        });
      });
    });

    this.setState((state) => ({
      ...state,
      phase: 'chooseLanguage',
      languages,
    }));
  }

  getRandomProblem(problems = null) {
    problems = problems ?? this.state.problems;
    return Object.assign({}, problems[Math.floor(Math.random() * problems.length)]);
  }

  getRandomCorrectMessage(isCorrect) {
    const messages = isCorrect ? this.state.languageInfo.correctMessages
      : this.state.languageInfo.incorrectMessages;
    return {
      isCorrect: isCorrect,
      message: messages[Math.floor(Math.random() * messages.length)]
    };
  }

  begin() {
    this.setState((state) => Object.assign({}, state, {
      phase: 'chooseLanguage'
    }));
  }

  restart() {
    this.setState((state) => Object.assign({}, defaultState, {
      phase: 'chooseLanguage',
      languages: this.state.languages,
      muted: this.state.muted,
    }));
  }

  chooseLanguage(language) {
    this.setState((state) => ({
      ...state,
      languageInfo: state.languages[language],
      language,
      phase: 'chooseDirection',
    }));
  }

  chooseDirection(direction) {
    this.setState((state) => ({
      ...state,
      direction,
      phase: 'chooseCategory',
    }));
  }

  chooseCategory(category) {
    let problemQueue = [];
    const problems = this.state.languageInfo.problems
        .filter(problem =>
          (category === this.state.languageInfo.allWord || problem.categories.includes(category)) &&
          (this.state.direction === 'bothWays' ||
            (this.state.direction === 'toEnglish' && problem.toEnglish) ||
            (this.state.direction === 'toTargetLanguage' && !problem.toEnglish)));
    for (let i = 0; i < incorrectAnswerRetryInterval; i++) {
      problemQueue.push(this.getRandomProblem(problems));
    }
    const currentProblem = problemQueue.shift();
    this.setState((state) => ({
      ...state,
      problems,
      phase: 'play',
      problemQueue: problemQueue,
      currentProblem: currentProblem,
      category,
    }));
  }

  checkAnswer() {
    if (this.state.input === '') {
      return;
    }
    clearTimeout(this.state.correctMessageTimeoutId);
    const correctMessageTimeoutId = setTimeout(this.clearCorrectMessage,
      1000 * correctMessageDisplayTimeSeconds)
    const isCorrect = this.state.currentProblem.answers.map(answer => answer.toLowerCase())
      .includes(this.state.input.trim().toLowerCase());

    const newState = Object.assign({}, this.state, {
      numberOfProblems: this.state.numberOfProblems + 1,
      correctMessageTimeoutId: correctMessageTimeoutId
    });

    let newestState;
    if (isCorrect) {
      if (!this.state.muted) {
        correctSound.play();
      }
      const [currentProblem, ...problemQueue] = this.state.problemQueue;
      const queuedQuestion = this.state.mistakesOnCurrentProblem ?
        this.state.currentProblem : this.getRandomProblem();
      problemQueue.push(queuedQuestion);
      newestState = {
        currentProblem: currentProblem,
        problemQueue: problemQueue,
        mistakesOnCurrentProblem: false,
        input: '',
        correctMessage: this.getRandomCorrectMessage(true),
        numberCorrect: this.state.numberCorrect + 1
      }
      document.querySelector('input').value = '';
    } else {
      if (!this.state.muted) {
        incorrectSound.play();
      }
      const correctMessage = this.state.mistakesOnCurrentProblem >= 2 ? {
        isCorrect: false,
        message: `${this.state.languageInfo.tryMessage} ${this.state.currentProblem.answers.map(answer => `"${answer}"`)
          .join(` ${this.state.languageInfo.orMessage} `)}.`
      } : this.getRandomCorrectMessage(false);
      newestState = {
        mistakesOnCurrentProblem: this.state.mistakesOnCurrentProblem + 1,
        correctMessage: correctMessage
      }
    }
    this.setState(() => Object.assign({}, newState, newestState));
  }

  clearCorrectMessage() {
    this.setState((state) => Object.assign({}, state, {
      correctMessage: '',
      correctMessageTimeoutId: null
    }));
  }

  updateInput(event) {
    this.setState((state) => Object.assign({}, state, {
      input: event.target.value
    }))
  }

  handleKeyPress(event) {
    if (event.charCode === 13) {
      this.checkAnswer();
    }
  }

  toggleMute() {
    this.setState((state) => ({
      ...state,
      muted: !state.muted,
    }));
  }

  render() {
    let content;
    switch (this.state.phase) {
      case 'loading':
        content = (
          <h1>loading vocab...</h1>
        );
        break;
      case 'chooseLanguage':
        content = (
          <div className="options">
            {Object.keys(this.state.languages).map(language => (
              <button key={language} onClick={() => this.chooseLanguage(language)}>{language}</button>
            ))}
          </div>
        );
        break;
      case 'chooseDirection':
        content = (
          <div className="options vertical-options">
            <p className="language-for-direction">{this.state.language}</p>
            <div className="options">
              <button key={'toEnglish'} onClick={() => this.chooseDirection('toEnglish')}>
                <FontAwesomeIcon icon={faArrowDown} />
              </button>
              <button key={'bothWays'} className="bidirectional-arrows" onClick={() => this.chooseDirection('bothWays')}>
              <FontAwesomeIcon className="bidirectional-up-arrow" icon={faArrowUp} />
              <FontAwesomeIcon className="bidirectional-down-arrow" icon={faArrowDown} />
              </button>
              <button key={'toTargetLanguage'} onClick={() => this.chooseDirection('toTargetLanguage')}>
                <FontAwesomeIcon icon={faArrowUp} />
              </button>
            </div>
            <p className="language-for-direction">{this.state.languageInfo.english}</p>
          </div>
        );
        break;
      case 'chooseCategory':
          content = (
            <div className="options">
              {[this.state.languageInfo.allWord, ...this.state.languageInfo.categories].map(category =>
                <button key={category} onClick={() => this.chooseCategory(category)}>{category}</button>
              )}
            </div>
          );
          break;
      case 'play':
        const correctMessageId = this.state.correctMessage.isCorrect ?
          "correct" : "incorrect";
        const accuracy = Math.round(this.state.numberCorrect / this.state.numberOfProblems * 100);
        const score = this.state.numberOfProblems ?
          `${this.state.numberCorrect}/${this.state.numberOfProblems} (${accuracy}%)` : '';
        const problem = this.state.currentProblem;
        content = (
          <div id="game-box">
            <div>
              <h2 className="light-font">{this.state.languageInfo.writeThisIn} {problem.toEnglish ?
                this.state.languageInfo.english : this.state.language}:</h2>
              <h2><span className="extra-bold-font">{problem.question}</span></h2>
            </div>
            <InputBox value={this.props.input}
              handleChange={(event) => this.updateInput(event)}
              handleKeyPress={(event) => this.handleKeyPress(event)}/>
            <h2 className="bottom-message" id={correctMessageId}>
              {this.state.correctMessage.message}</h2>
            <h2 className="bottom-message">{score}</h2>
          </div>
        );
        break;
      default:
        break;
    }
    return(
      <div id="container">
        {content}
        <button className="bottom-button" id="home-button" onClick={this.restart}>Duokonjo</button>
        <button className="bottom-button" id="mute-button" onClick={this.toggleMute}>
          <FontAwesomeIcon icon={this.state.muted ? faVolumeMute : faVolumeUp } />
        </button>
      </div>
    );
  }
}

export default App;
