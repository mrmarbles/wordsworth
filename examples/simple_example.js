var dictionary = require('../lib/spell_checker').getInstance();

// load the dictionary with the provided index and spell checking data
dictionary.initialize(
  '../data/en_US/index.txt',
  '../data/en_US/training.txt',
  function() {

    // exists() checks to see if the dictionary knows about the word - is it valid?
    console.log(dictionary.exists('pseudonym'));
    console.log(dictionary.exists('fleurgendorfer'));

    // suggest() spell checks the given word returning an ordered array
    // of suggestions based off of training data probability
    console.log(dictionary.suggest('kommissioner'));
    console.log(dictionary.suggest('danse'));

    // analyze() will spell check a sentence
    console.log(dictionary.analyze("The Pentagon said it would send ground-based THAAD missile-interceptor " +
      "batteries to protect military bases on the island of Guam, a US territory some 3,380 kilometres (2,100 miles)" +
      " southeast of North Korea and home to 6,000 American military personnel, submarines and bombers."))

});