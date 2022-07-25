# Duokonjo
Welcome to *Duokonjo* - a lame version of [duolingo.com](https://www.duolingo.com) for learning vocab, but customizable with whatever language and words you want!
<br><br>
![gameplay](https://raw.githubusercontent.com/BenRStutzman/duokonjo/master/pictures/gameplay.png)
<br><br>
![vocabSheet](https://raw.githubusercontent.com/BenRStutzman/duokonjo/master/pictures/vocabSheet.png)
<br>
## Running the program
In the command prompt, navigate into the `duokonjo` folder. To run the program in development, run `npm start`. To run the program for production, run `npm run build` and then `serve build`. (You must first have npm and install `serve` with `npm install -g serve` if you haven't already.) You will then be directed to go to an address such as http://localhost:5000 in a browser.

## Playing the game
Choose your language, translation direction, and category to begin (see "adding vocab" to learn how to add another language). The game will prompt you with a word or phrase in English or the language you're learning. Translate the word or phrase and type your answer in the input box, then press enter to see if you're right. Repeat ad infinitum!

## Adding vocab
To add vocab, edit `src/vocab.txt` and then re-build the program with `npm run build`. Just follow the spacing pattern of the existing vocab, or use these instructions if you want them spelled out:
1. Separate each language section (e.g. all the Portuguese words) with two blank lines.
2. The first eight lines of each language section should contain:
    1. The name of the language
    2. "English: " followed by the word for "English" in that language
    3. "All: " followed by the word for "all" in that language
    4. "Write this in: " followed by the phrase for "write this in" in that language
    5. "Correct: " followed by the options for messages to display when the player answers correctly, separated by forward slashes
    6. "Incorrect: " followed by the options for messages to display when the player answers incorrectly, separated by forward slashes
    7. "Try: " followed by the word for "try" in that language
    8. "Or: " followed by the word for "or" in that language

    - For example, the first four lines of the Portuguese section could be:
      > Portugués<br>
      > English: Inglés<br>
      > All: Todas<br>
      > Write this in: Escreve isto em<br>
      > Correct: Correto!/Ótimo!/Fixe!<br>
      > Incorrect: Incorreto./Opa./Não.<br>
      > Try: Tente<br>
      > Or: ou
3. Include a blank line after the above header information for each language section.
4. Within each language section, separate each vocab section (e.g. all the greetings)
   with a blank line.
5. Within each vocab section, put the category name first (e.g. 'Saludacoes') on its
   own line, and the vocab pairs on the following lines.
6. Within each vocab pair, put the English word/phrase first, followed by a colon, 
   a space, and then the word/phrase in the target language (e.g. 'good morning: bom dia').
7. For words/phrases with multiple correct answers, separate each word/phrase
   with a forward slash (e.g. 'hello/hi: olá/oi').

## Sound sources
- Correct: https://freesound.org/people/StavSounds/sounds/546082/
- Incorrect: https://freesound.org/people/Bertrof/sounds/131657/
