import React from 'react';
import verbsFile from './vocab.txt';
import correctSoundFile from './sounds/correct.wav';
import incorrectSoundFile from './sounds/incorrect.wav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeMute, faVolumeUp, faSyncAlt } from '@fortawesome/free-solid-svg-icons'

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
    let languageName;
    let english;
    let correctMessages;
    let incorrectMessages;
    let tryMessage;
    let orMessage;
    let category;
    let englishPhrases;
    let vocabPairs;
    let targetLanguagePhrases;

    var text = await fetch(verbsFile)
      .then(result => result.text());

    const languageSets = text.trim().split(/\s*\n\s*\n\s*\n\s*/);
    languageSets.forEach(languageSet => {
      [info, ...categorySets] = languageSet.split(/\s*\n\s*\n\s*/);
      [language, writeThisIn, languageName, english, correctMessages, incorrectMessages, tryMessage, orMessage] = info.split(/\s*\n\s*/);
      languages[language] = {
        writeThisIn: writeThisIn.split(/:\s*/)[1],
        languageName: languageName.split(/:\s*/)[1],
        english: english.split(/:\s*/)[1],
        correctMessages: correctMessages.split(/:\s*/)[1].split('/'),
        incorrectMessages: incorrectMessages.split(/:\s*/)[1].split('/'),
        tryMessage: tryMessage.split(/:\s*/)[1],
        orMessage: orMessage.split(/:\s*/)[1],
        categories: [],
      };
      categorySets.forEach(categorySet => {
        [category, ...vocabPairs] = categorySet.split(/\s*\n\s*/);
        const problems = [];
        vocabPairs.forEach(vocabPair => {
          [englishPhrases, targetLanguagePhrases] = vocabPair.split(/:\s+/)
            .map(phrases => phrases.split('/'));
          englishPhrases.forEach(phrase => {
            problems.push({
              question: {
                toEnglish: false,
                phrase,
              },
              answers: targetLanguagePhrases
            });
          });
          targetLanguagePhrases.forEach(phrase => {
            problems.push({
              question: {
                toEnglish: true,
                phrase,
              },
              answers: englishPhrases
            });
          });
          languages[language].categories[category] = problems;
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
    }));
  }

  chooseLanguage(language) {
    this.setState((state) => ({
      ...state,
      languageInfo: state.languages[language],
      language,
      phase: 'chooseCategory',
    }))
  }

  chooseCategory(category) {
    let problemQueue = [];
    let problems = [];

    if (category === 'All') {
      Object.values(this.state.languageInfo.categories).forEach(category => {
        problems = [...problems, ...category];
      });
    } else {
      problems = this.state.languageInfo.categories[category];
    }
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
    this.setState((state) => Object.assign({}, newState, newestState));
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
          <h1>loading verbs...</h1>
        );
        break;
      case 'chooseLanguage':
        content = (
          <div id="options">
            {Object.keys(this.state.languages).map(language => (
              <button key={language} onClick={() => this.chooseLanguage(language)}>{language}</button>
            ))}
          </div>
        );
        break;
      case 'chooseCategory':
          content = (
            <div id="options">
              {['All', ...Object.keys(this.state.languageInfo.categories)].map(category => (
                <button key={category} onClick={() => this.chooseCategory(category)}>{category}</button>
              ))}
            </div>
          );
          break;
      case 'play':
        const correctMessageId = this.state.correctMessage.isCorrect ?
          "correct" : "incorrect";
        const accuracy = Math.round(this.state.numberCorrect / this.state.numberOfProblems * 100);
        const score = this.state.numberOfProblems ?
          `${this.state.numberCorrect}/${this.state.numberOfProblems} (${accuracy}%)` : '';
        const question = this.state.currentProblem.question;
        content = (
          <div id="game-box">
            <div>
              <h2 className="light-font">{this.state.languageInfo.writeThisIn} {question.toEnglish ?
                this.state.languageInfo.english : this.state.languageInfo.languageName}:</h2>
              <h2><span className="extra-bold-font">{question.phrase}</span></h2>
            </div>
            <InputBox value={this.props.input}
              handleChange={(event) => this.updateInput(event)}
              handleKeyPress={(event) => this.handleKeyPress(event)}/>
            <h2 className="correct-message" id={correctMessageId}>
              {this.state.correctMessage.message}</h2>
            <h2>{score}</h2>
          </div>
        );
        break;
      default:
        break;
    }
    return(
      <div id="container">
        {content}
        <h1 id="duokonjo">Duokonjo</h1>
        {this.state.phase === 'play' &&
          <>
            <FontAwesomeIcon
              id="mute-button"
              onClick={this.toggleMute}
              icon={this.state.muted ? faVolumeMute : faVolumeUp }
            />
            <FontAwesomeIcon id="restart-button" onClick={this.restart} icon={faSyncAlt} />
          </>
        }
      </div>
    );
  }
}

export default App;
