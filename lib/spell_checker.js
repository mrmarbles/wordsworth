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
 * Initializes the dictionary and trains the
 * spell-checking model.  Will invoke the provided
 * callback function when initialization and training
 * are complete.
 *
 * The first argument 'indexPath' must contain a relative
 * path to a pre-compiled dictionary index file.  A default
 * one has been provided in /data/en_US/index.txt.  You can
 * however generate your own index with the provided /bin/index_compiler.js
 * by specifying a file containing all the terms that you would like
 * to be a part of the index, and then providing that file path
 * to the compiler on line 3.
 *
 * The second argument 'spellDefPath' must contain a relative
 * path to a file containing any textual data.  This data is used
 * to generated a spelling prediction model for the dictionary so
 * to get the best results, the more information in that file the
 * better.  A sample one is provided in /data/en_US/training.txt.
 *
 * @param indexPath Path to pre-compiled dictionary index file.
 * @param spellDefPath Path to a file containing spell checker training data.
 * @param ready
 */
SpellChecker.prototype.initialize = function(indexPath, spellDefPath, ready) {
  var index = 1, refined, self = this;
  reader.eachLine(indexPath, function(line) {
    // first, initialize the dictionary itself
    refined = line.replace(/(\r\n|\n|\r)/gm, '');
    dict[index] = refined;
    // train the spell checker with this dictionary data
    self.train(refined);
    index++;
  }).then(function() {
    // now train the spell-checking feature
    reader.eachLine(spellDefPath, function(line) {
      self.train(line);
    }).then(ready);
  });
};

SpellChecker.prototype.initialize = function(seedPath,
  trainingDataPath, callback) {

  var self = this;
  reader.eachLine(seedPath, function(line) {
    self.addWord(line);
    self.train(line);
  }).then(function() {
    // now train the spell-checking feature
    reader.eachLine(trainingDataPath, function(line) {
      self.train(line);
    }).then(callback);
  });

};

SpellChecker.prototype.addWord = function(word) {
  var word = word.replace(/(\r\n|\n|\r)/gm, ''), len = word.length;
  if (!dict[len]) {
    dict[len] = word;
  } else if (!this.exists(word)) {
    dict[len] = dict[len].concat(word);
  }
};

SpellChecker.prototype.createIndex = function(words, callback) {

  var individualized = normalize(words),
    i = 0, word, dupCheck = {};

  for (; i < individualized.length; i++) {

    word = individualized[i];

    if (dupCheck[word]) {
      continue;
    }

    if (dict[word.length]) {
      dict[word.length] = dict[word.length].concat(word);
    } else {
      dict[word.length] = word;
    }

    dupCheck[word] = true;
    // this.train(word); // train the spell-checking feature with this word
  }

  if (callback) {
    callback();
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
    (probability) ? probability = probability + 1 : probabilityModel[term] = 1;
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
        term: candidate,
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
    return suggestion;
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

  var len = word.length, words = (dict[len].length / len), low = 0,
    high = (words - 1), mid = Math.floor(words /2), found;

  if (!dict[len]) {
    return false;
  }

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
