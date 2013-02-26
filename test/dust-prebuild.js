'use strict';

var should = require('should'),
		prebuild = require('../index');

var inputStr = '<p>{@content key="test.value" /}</p><p>{@helper attr="value"/} {randomData}</p><p>{@content key="test.otherValue"/}</p>';
var inputData = {"test":{"value":"resultantValue", "otherValue":"otherResultantValue"}};
var correctResult = '<p>resultantValue</p><p>{@helper attr="value"/} {randomData}</p><p>otherResultantValue</p>';

describe('dust-prebuild', function() {
	describe('#parse', function() {
		it('should parse the input string, replace where possible, and return a resultant string', function(next) {
			prebuild.parse(inputStr, inputData, function(err, result) {
				should.not.exist(err);
				should.exist(result);

				result.should.equal(correctResult);
				next();
			});
		});
	});
});