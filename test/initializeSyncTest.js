/**
 * a unit-test for the synchronous initialization feature
 * 
 * @author Erel Segal-Halevi
 * @since 2013-08
 */

var should = require('should');
var sp = require('../lib/spell_checker').getInstance();

describe('spell checker', function() {
	it('should support synchronous initialization', function() {
		var seeds = ['sentence', 'have', 'few', 'fig', 'spelling', 'errors', 'polymorphism'];
		var train = [
			'I ate a fig',
			'I have a few figs',
			'I have a few thoughts about polymorphism of spelling errors'
		];
		
		sp.initializeSync(seeds, train);
		sp.exists('polymorphism').should.equal(true);
		sp.suggest('polymrphism').should.eql([ 'polymorphism' ]);
		var analysis = sp.analyze('This sentense will havv a fiw speling errorrs.');
		analysis['sentense'][0].should.equal('sentence');
		analysis['havv'][0].should.equal('have');
		analysis['fiw'][0].should.equal('few');
		analysis['speling'][0].should.equal('spelling');
		analysis['errorrs'][0].should.equal('errors');
	});
})
