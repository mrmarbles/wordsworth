var reader = require('line-reader'),
  fs = require('fs'),
  pathRaw = '../data/en_US/seed.txt',
  pathNew = '../data/en_US/index.txt';

console.log('Checking to see if compiled index exists..');

if (fs.existsSync(pathNew)) {
  console.log('Index exists - deleting...');
  fs.unlinkSync(pathNew);
} else {
  console.log('Initializing new index...');
  fs.writeFileSync(pathNew, '');
}

var dictionary = {},
  termsCount = 0,
  indexCount = 0;

console.log('Compiling en_US index...');

reader.eachLine(pathRaw, function(line, last) {

  var len = line.length,
    term = line.replace(/(\r\n|\n|\r)/gm, '');

  termsCount++;

  if (!dictionary[len]) {
    dictionary[len] = term;
    indexCount++;
  } else {
    dictionary[len] = dictionary[len].concat(term);
  }

}).then(function() {

  // now write the dictionary file
  for (var i = 1; i <= indexCount; i++) {

    if (!dictionary[i]) {
      continue;
    }

    fs.appendFileSync(pathNew, dictionary[i] + '\r\n');

  }

    for (key in dictionary) {
      console.log(key);
    }

  console.log("DONE!");
  console.log('Created en_US index out of ' + termsCount + ' terms.');
});