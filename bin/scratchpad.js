var sp = require('../lib/spell_checker').getInstance();

sp.initialize(
  '../data/en_US/seed.txt',
  '../data/en_US/training.txt', function() {

  console.log(sp.exists('hello'));
  console.log(sp.exists('polymorphism'));

  console.log(sp.suggest('polymrphism'));
  console.log(sp.analyze('this is a test, this is only a danse.'));

});