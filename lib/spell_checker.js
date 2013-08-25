var dict = {},
  probabilityModel = {},
  reader = require('line-reader'),
  alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Use the factory method getInstance()
 * instead of instantiating SpellChecker
 * instances directly.
 *
 * @constructor
 */
var SpellChecker = function() {};

/**
 * PRIVATE METHOD
 *
 * Converts a whitespace-demarcated string into
 * an array of lower-cased terms without punctuation.
 *
 * Hyphenated words are separated.
 *
 * @param words
 * @return {Array}
 */
var normalize = function(words) {
  return words.replace(/\-/g, ' ')
    .replace(/[\.,-\/#?!$%\^'"&\*;:{}=\-_`~()]/g, '')
    .toLowerCase().split(/\s+/g);
};

/**
 * Initializes the SpellChecker and trains the
 * spell-checking model.  Will invoke the provided
 * callback function when initialization and training
 * are complete.
 *
 * The first argument 'seedPath' must contain a relative
 * path to file containing words that the spell checker
 * will 'understand'.  Ideally this file will contain a list of
 * words representing the entire language for which the spell-checker
 * will be used.  A default list has been provided in /data/en_US/seed.txt.
 * (for english - not complete, containing approx 100k+ terms) You can
 * however use your own file.
 *
 * The second argument 'trainingDataPath' must contain a relative
 * path to a file containing textual data which will be used
 * to generated a spelling prediction model which will be consulted
 * when potentially spelling correction matches are generated when
 * the suggest() or analyze() methods are invoked. Generally speaking,
 * the larger the training data set, the more accurate the spelling
 * suggestions.  A sample one is provided in /data/en_US/training.txt.
 *
 * @param seedPath Path to a list of words that the spell checker will understand.
 * @param trainingDataPath Path to a file containing spell checker training data.
 * @param callback Callback function that will be invoked post initialization.
 */
SpellChecker.prototype.initialize = function(seedPath,
  trainingDataPath, callback) {

  var self = this;
  reader.eachLine(seedPath, function(line) {
    self.understand(line);
    self.train(line); // train the spelling model with each index term
  }).then(function() {
    // now fully-train the spell-checking feature
    reader.eachLine(trainingDataPath, function(line) {
      self.train(line);
    }).then(callback);
  });
};


/**
 * Initializes the SpellChecker and trains the
 * spell-checking model synchronously.
 *
 * The first argument 'seedWords' must be an array of words that the spell checker
 * will 'understand'.  Ideally this array will contain a list of
 * words representing the entire language for which the spell-checker
 * will be used.  A default list has been provided in /data/en_US/seed.txt.
 * (for english - not complete, containing approx 100k+ terms) You can
 * however use your own array.
 *
 * The second argument 'trainSentences' must be an array of textual data which will be used
 * to generated a spelling prediction model which will be consulted
 * when potentially spelling correction matches are generated when
 * the suggest() or analyze() methods are invoked. Generally speaking,
 * the larger the training data set, the more accurate the spelling
 * suggestions.  A sample one is provided in /data/en_US/training.txt.
 *
 * @param seedWords array of words that the spell checker will understand.
 * @param trainSentences array of sentences to be used as spell checker training data.
 */
SpellChecker.prototype.initializeSync = function(seedWords, trainSentences) {
  var self=this;
  seedWords.forEach(function(word) {
    self.understand(word);
    self.train(word);
  });
  trainSentences.forEach(function(sentence) {
    self.train(sentence); 
  });
}


/**
 * Adds the given word to the index of the spell-checker if
 * the word does not already exist.  Added word will not be
 * 'trained', or considered in any future probability model
 * calculations for the given word.
 *
 * @param word
 */
SpellChecker.prototype.understand = function(word) {
  var term = word.replace(/(\r\n|\n|\r)/gm, ''), len = term.length;
  if (!dict[len]) {
    dict[len] = term;
  } else if (!this.exists(term)) {
    dict[len] = dict[len].concat(term);
  }
};

/**
 * Trains the spell-checking feature.  It is recommended
 * that a large amount of text be utilized in order for the
 * spell-checking feature to produce a reliable word probability
 * model.  Text used to train the spell-checking feature of the
 * dictionary is NOT used to seed the dictionary itself.
 *
 * Words found in the training text that do not
 * exist in the dictionary are not automatically
 * added to the dictionary itself.
 *
 * @param text
 */
SpellChecker.prototype.train = function(text) {
  var terms = normalize(text), i = 0, probability, term;
  for (; i < terms.length; i++) {
    term = terms[i];
    probability = probabilityModel[term];
    (probabilityModel[term]) ? probabilityModel[term] =
      probabilityModel[term] + 1 : probabilityModel[term] = 1;
  }
};

/**
 * Spell-checker based off of Peter Norvig's publication;
 *
 * http://norvig.com/spell-correct.html
 *
 * Will return an array of alternate
 * spelling suggestions for the given word ordered by
 * probability (based on the training model).  The
 * suggestion with the most likely correct spelling will
 * exist at the first index of the array (index 0), the
 * second most probable in the 2nd position, etc.
 *
 * Given words that have an exact dictionary match will
 * return zero results (not misspelled).
 *
 * @param input
 * @return {Array}
 */
SpellChecker.prototype.suggest = function(input) {

  var i, candidates = [], registry = {}, candidate,
    evaluate, refined, probabilityIndex, self = this;

  // if the provided word exists in the dictionary, there's nothing to suggest
  if (this.exists(input)) {
    return candidates;
  }

  evaluate = function(candidate, term) {
    // exclude nonsensical permutations, numbers, exact matches AND duplicates
    probabilityIndex = probabilityModel[candidate];
    if (candidate !== term && !registry[candidate] && probabilityIndex && self.exists(candidate)) {
      registry[candidate] = true;
      candidates.push({
        word: candidate,
        probability: (probabilityIndex) ? probabilityIndex : 0
      });
    }
  };

  // deletes
  for (i = 0; i < input.length; i++) {
    candidate = input.slice(0, i) + input.slice(i + 1);
    evaluate(candidate, input);
  }

  // transposes
  for (i = 0; i < input.length - 1; i++) {
    candidate = input.slice(0, i) + input.slice(i + 1, i + 2) + input.slice(i, i + 1) + input.slice(i + 2);
    evaluate(candidate, input);
  }

  // replacements
  for (i = 0; i < input.length; i++) {
    alphabet.forEach(function (letter) {
      candidate = input.slice(0, i) + letter + input.slice(i + 1);
      evaluate(candidate, input);
    });
  }

  // inserts
  for (i = 0; i <= input.length; i++) {
    alphabet.forEach(function (letter) {
      candidate = input.slice(0, i) + letter + input.slice(i);
      evaluate(candidate, input);
    });
  }

  // order by probability and return only the ordered terms as an array
  refined = candidates.sort(function(a, b) {
    return (parseInt(b.probability, 10) - parseInt(a.probability, 10));
  }).map(function(suggestion) {
    return suggestion.word;
  });

  return refined;
};

/**
 * Accepts a single word or term, and returns a boolean
 * result depending upon whether or not the dictionary
 * recognizes that term.
 *
 * Source derived from;
 *
 *    http://ejohn.org/blog/revised-javascript-dictionary-search/
 *    https://github.com/jeresig/trie-js
 *
 * @param word
 * @return {boolean}
 */
SpellChecker.prototype.exists = function(word) {

  var len = word.length;

  if (!dict[len]) {
    return false;
  }
  
  var words = (dict[len].length / len), low = 0,
    high = (words - 1), mid = Math.floor(words /2), found;  

  while (high >= low) {
    found = dict[len].substr(len * mid, len);

    if (word === found) {
      return true;
    }

    (word < found) ? high = (mid - 1) : low = (mid + 1);
    mid = Math.floor((low + high) / 2);
  }

  return false;
};

/**
 * Accepts one or more words (space-demarcated) and will
 * return an object containing spelling suggestions
 * for any word not recognized in the sentence.
 *
 * Will return an empty object if nothing in the
 * sentence was misspelled (or all were recognized).
 *
 * @param sentence
 * @return {{}}
 */
SpellChecker.prototype.analyze = function(sentence) {

  var all = normalize(sentence), i = 0,
    word, analysis = {};

  for (; i < all.length; i++) {
    word = all[i];
    // exclude words that are known and numbers
    if (!this.exists(word) && (isNaN(parseInt(word)))) {
      analysis[word] = this.suggest(word);
    }
  }

  return analysis;

};

/**
 * Factory method.  Returns an instance
 * of SpellChecker.
 *
 * @return {SpellChecker}
 */
exports.getInstance = function() {
  return new SpellChecker();
};
