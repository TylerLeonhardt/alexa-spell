/*global require, module, console */
/*************************
Setup
*************************/

var botBuilder = require('claudia-bot-builder'),
AlexaMessageBuilder = require('alexa-message-builder'),
getIntentName = function (alexaPayload) {
'use strict';
return alexaPayload &&
    alexaPayload.request &&
    alexaPayload.request.type === 'IntentRequest' &&
    alexaPayload.request.intent &&
    alexaPayload.request.intent.name;
};
var Tokenizer = require('sentence-tokenizer');
var tokenizer = new Tokenizer('Chuck');
var WordPOS = require('wordpos');
var wordpos = new WordPOS();
var randy = require('randy');
var Promise = require('promise');

var self = this;

self._nouns      = require('./words/nouns.js');
self._adjectives = require('./words/adjectives.js');
self._books = require('./books/books.js');

// Maybe we can put all this init stuff in a separate function?
// Books
var peterRabbitSentences = generate(self._books.peterRabbitBook);
var myFathersDragonSentences = generate(self._books.myFathersDragonBook);
var benjaminBunnySentences = generate(self._books.benjaminBunnyBook);
var allSentences = [peterRabbitSentences, myFathersDragonSentences, benjaminBunnySentences];

// Phrases
var congrats = ["You did it!", "You're so smart!", "Wow, look at you go!", "Genius!"];
var animals = ["https://i.imgur.com/3ojUvZC.png", "https://cdn.pixabay.com/photo/2017/01/31/20/12/animal-2026944_1280.png", "https://i.imgur.com/3tk7OGN.png", "https://i2.wp.com/cdn.playbuzz.com/cdn/569f3ed2-2005-4d71-8aa4-877a23d27824/92dc9230-b713-4d11-81c0-da398ccdd062.png", "https://www.ookbeecomics.com/images/meme-18.png"];
var appTitle = "Sentence Master";

/*************************
Bot
*************************/

const api = botBuilder(
	function (message, originalRequest) {
		'use strict';
		console.log(originalRequest.body);
		if (getIntentName(originalRequest.body) === 'ExitApp'){
			// return a JavaScript object to set advanced response params
			// this prevents any packaging from bot builder and is just
			// returned to Alexa as you specify
			return new AlexaMessageBuilder()
                .addText("Thanks for playing! See you soon!")
                .get();
		} else if (getIntentName(originalRequest.body) === 'GetQuestion'){

            let question = originalRequest.body.session.attributes.questionData;

            let text = "Here's your sentence! " +
                question.sentence.replace("___", "blank") +
                " Is it" +
                ". A.. " + question.options[0] +
                ". B.. " + question.options[1] +
                ". C.. " + question.options[2] +
                ". D.. " + question.options[3]

            let options = "A. " + question.options[0] +
                "\nB. " + question.options[1] +
                "\nC. " + question.options[2] +
                "\nD. " + question.options[3]

            return new AlexaMessageBuilder()
                .addText(text)
                .addSimpleCard(appTitle, question.sentence + "\n\n" + options)
                .addSessionAttribute('questionData', question)
                .addSessionAttribute('quitting', false)
                .keepSession()
                .get()
        } else if (getIntentName(originalRequest.body) === 'NewQuestion'){
            return generateQuestion (allSentences[Math.floor(Math.random() * allSentences.length)]).then(function (question) {
                let text = "Let's keep going! Here's your next sentence! " +
                question.sentence.replace("___", "blank") +
                    " .. Is it.." +
                    ". A.. " + question.options[0] +
                    ". B.. " + question.options[1] +
                    ". C.. " + question.options[2] +
                    ". D.. " + question.options[3]

                let options = "A. " + question.options[0] +
                    "\nB. " + question.options[1] +
                    "\nC. " + question.options[2] +
                    "\nD. " + question.options[3]

                return Promise.resolve(new AlexaMessageBuilder()
                    .addText(text)
                    .addSimpleCard(appTitle, question.sentence + "\n\n" + options)
                    .addSessionAttribute('questionData', question)
                    .addSessionAttribute('quitting', false)
                    .keepSession()
                    .get())
            })
        } else if (getIntentName(originalRequest.body) === 'GetAnswer'){
            let status = originalRequest.body.request.intent.slots.answer.resolutions.resolutionsPerAuthority[0].status.code;
            let quitting = originalRequest.body.session.attributes.quitting;

            // Check if the user responded with the actual word instead of A, B, C, D
            // Extra check if the answer is "No" so we don't quit the app
            if (status === "ER_SUCCESS_NO_MATCH" && !quitting) {
                let guess = originalRequest.body.request.intent.slots.answer.value;
                let question = originalRequest.body.session.attributes.questionData;

                // Correct word guess, generate new question and ask it
                if (question.options[question.answer].indexOf(guess) > -1) {
                    return generateQuestion (allSentences[Math.floor(Math.random() * allSentences.length)]).then(function (question) {
                        let text = "Okay, let's keep going! Here's your next sentence! " + question.sentence.replace("___", "blank") +
                            " .. Is it.. " +
                            ". A.. " + question.options[0] +
                            ". B.. " + question.options[1] +
                            ". C.. " + question.options[2] +
                            ". D.. " + question.options[3];
    
                        let options = "A. " + question.options[0] +
                            "\nB. " + question.options[1] +
                            "\nC. " + question.options[2] +
                            "\nD. " + question.options[3];
    
                        let msg = congrats[Math.floor(Math.random() * congrats.length)];
                        let img = animals[Math.floor(Math.random() * animals.length)];
                        return new AlexaMessageBuilder()
                            .addText(msg + " Want to do another one?")
                            .addStandardCard(msg, "Want to do another one?", {
                                smallImageUrl: img,
                                largeImageUrl: img})
                            .addSessionAttribute('questionData', question)
                            .addSessionAttribute('quitting', true)
                            .keepSession()
                            .get()
                    });
                } else {
                    let options = "A. " + question.options[0] +
                            "\nB. " + question.options[1] +
                            "\nC. " + question.options[2] +
                            "\nD. " + question.options[3];
                            
                    return Promise.resolve(new AlexaMessageBuilder()
                    .addText("So close! Try again.")
                    .addSimpleCard(appTitle, question.sentence + "\n\n" + options)
                    .addSessionAttribute('questionData', question)
                    .addSessionAttribute('quitting', false)
                    .keepSession()
                    .get());
                }
            }

            // Otherwise, they guessed a letter A, B, C, D
            let guess = originalRequest.body.request.intent.slots.answer.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            let question = originalRequest.body.session.attributes.questionData;
            
            // throw JSON.stringify(question) + " " + guess
            // console.log(question + " " + guess)
            let options = "A. " + question.options[0] +
                "\nB. " + question.options[1] +
                "\nC. " + question.options[2] +
                "\nD. " + question.options[3];

            // YES -- because Alexa isn't matching the right slots
            if (parseInt(guess) == 4) {
                return generateQuestion (allSentences[Math.floor(Math.random() * allSentences.length)]).then(function (question) {

                    let text = "Okay, let's keep going! Here's your next sentence! " + question.sentence.replace("___", "blank") +
                        " .. Is it.. " +
                        ". A.. " + question.options[0] +
                        ". B.. " + question.options[1] +
                        ". C.. " + question.options[2] +
                        ". D.. " + question.options[3];

                    let options = "A. " + question.options[0] +
                        "\nB. " + question.options[1] +
                        "\nC. " + question.options[2] +
                        "\nD. " + question.options[3];

                    return new AlexaMessageBuilder()
                        .addText(text)
                        .addSimpleCard(appTitle, question.sentence + "\n\n" + options)
                        .addSessionAttribute('questionData', question)
                        .addSessionAttribute('quitting', false)
                        .keepSession()
                        .get();
                });
            // NO
            } else if (parseInt(guess) == 5) {
                return new AlexaMessageBuilder()
                    .addText("Come back to play soon!")
                    .get();
            // ACTUAL ANSWER
            } else if (question.answer == parseInt(guess)) {
                let msg = congrats[Math.floor(Math.random() * congrats.length)];
                let img = animals[Math.floor(Math.random() * animals.length)];
                return new AlexaMessageBuilder()
                    .addText(msg + " Want to do another one?")
                    .addStandardCard(msg, "Want to do another one?", {
                        smallImageUrl: img,
                        largeImageUrl: img})
                    .addSessionAttribute('questionData', question)
                    .addSessionAttribute('quitting', false)
                    .keepSession()
                    .get()
            } else {
                return Promise.resolve(new AlexaMessageBuilder()
                    .addText("So close! Try again.")
                    .addSimpleCard(appTitle, question.sentence + "\n\n" + options)
                    .addSessionAttribute('quitting', false)
                    .addSessionAttribute('questionData', question)
                    .keepSession()
                    .get())
            }
        } else {
            return new AlexaMessageBuilder()
                .addText("Welcome! To start please say 'let's start'")
                .keepSession()
                .get()
        }
	},
	{ platforms: ['alexa'] }
);

module.exports = api;

/*************************
Helpers
*************************/

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

// Ex: var aliceSentences = generate(aliceBook);
// Generate sentences
function generate (book) {
    tokenizer.setEntry(book);
    return tokenizer.getSentences();
}

// Generate question
function generateQuestion (sentenceList) {
    var randSentence = sentenceList[getRandomInt(sentenceList.length - 1)];
    var wordCount = randSentence.split(' ').length;
    var randWord;

    while (wordCount < 4 || wordCount > 10) {
        randSentence = sentenceList[getRandomInt(sentenceList.length - 1)];
        wordCount = randSentence.split(' ').length;
    }

    return new Promise(function (resolve, reject) {

        wordpos.getNouns(randSentence).then(function (nounList) {
            randWord = nounList[getRandomInt(nounList.length - 1)];
            optionArr = randy.sample(self._nouns, 3);
            optionArr.push(randWord);
            randy.shuffleInplace(optionArr)
            resolve({
                sentence: randSentence.replace(randWord, '___'),
                options: optionArr,
                answer: optionArr.indexOf(randWord)
            });
        });

    });

}