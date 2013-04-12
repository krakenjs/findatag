'use strict';

var should = require('should'),
	prebuild = require('../index'),
	fs = require('fs');

prebuild.config({path:'./test/locales/'});

var correctResult = '<p>resultantValue</p><p>{@helper attr="value"/} {randomData}</p><p>otherResultantValue</p><p>You found me!</p>';

describe('dust-prebuild', function() {
	describe('#parse', function() {
		it('should parse the input string, replace where possible, and return a resultant string', function(next) {
			prebuild.parse("missing", fs.readFileSync('test/templates/missing.dust', 'utf8'), 'en-US', function(err, result) {
				should.not.exist(err);
				should.exist(result);

				result.should.equal(correctResult);
				next();
			});
		});
	});
});