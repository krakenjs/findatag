/*global describe:false, before:false, after:false, it:false*/
'use strict';

var assert = require('chai').assert,
    parser = require('../index'),
    fs = require('fs');


describe('parser', function () {

    describe('process', function () {

        it('should honor `pre` handler definition', function (next) {
            var handler = {
                tags: 'pre',

                onTag: function (def, callback) {
                    callback(null, def.name);
                }
            };

            parser.parse('./test/templates/missing.dust', handler, function (err, result) {
                assert.ok(!err);
                assert.strictEqual(result, '<p>pre</p><p>{@helper attr="value"/} {randomData}</p><p>pre</p><p>pre</p>');
                next();
            });
        });


        it('should honor `helper` handler definition', function (next) {
            var handler = {
                tags: 'helper',

                onTag: function (def, callback) {
                    callback(null, def.name);
                }
            };

            parser.parse('./test/templates/missing.dust', handler, function (err, result) {
                assert.ok(!err);
                assert.strictEqual(result, '<p>{@pre type="content" key="missing.value" /}</p><p>helper {randomData}</p><p>{@pre type="content" key="missing.otherValue"/}</p><p>{@pre type="content" key="missing.content"/}</p>');
                next();
            });
        });


        it('should honor `pre` and `helper` handler definition', function (next) {
            var handler = {
                tags: 'pre, helper',

                onTag: function (def, callback) {
                    callback(null, def.name);
                }
            };

            parser.parse('./test/templates/missing.dust', handler, function (err, result) {
                assert.ok(!err);
                assert.strictEqual(result, '<p>pre</p><p>helper {randomData}</p><p>pre</p><p>pre</p>');
                next();
            });
        });

    });


});