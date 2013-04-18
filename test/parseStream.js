/*global describe:false, before:false, beforeEach:false, after:false, it:false*/
'use strict';

var assert = require('chai').assert,
    fs = require('fs'),
    ParseStream = require('../lib/parseStream');


var chunkResolver = {

    get tags () {
        return ['pre', 'call'];
    },

    onTag: function (def, callback) {
        process.nextTick(function () {
            callback(null, def.name.toUpperCase());
        });
    },

    onText: function (def, callback) {
        callback(null, def);
    }

};

describe('parseStream', function () {

    it('should handle basic text', function (next) {
        var output = [];

        var stream = new ParseStream(chunkResolver);
        stream.on('data', function (chunk) {
            output.push(chunk);
        });

        stream.on('finish', function () {
            var str = Buffer.concat(output).toString('utf8');
            assert.strictEqual(str, 'Test string.');
            next();
        });

        stream.end('Test string.');
    });


    it('should handle a basic tag', function (next) {
        var output = [];

        var stream = new ParseStream(chunkResolver);
        stream.on('data', function (chunk) {
            output.push(chunk);
        });

        stream.on('finish', function () {
            var str = Buffer.concat(output).toString('utf8');
            assert.strictEqual(str, 'PRE');
            next();
        });

        stream.end('{@pre test="foo" /}');
    });


    it('should handle multiple writes', function (next) {
        var output = [];

        var stream = new ParseStream(chunkResolver);
        stream.on('data', function (chunk) {
            output.push(chunk);
        });

        stream.on('finish', function () {
            var str = Buffer.concat(output).toString('utf8');
            assert.strictEqual(str, 'Test foo call CALL');
            next();
        });

        stream.write('Test foo');
        stream.write(' call ');
        stream.write('{@call ');
        stream.end('me="maybe" /}');
    });


    it('should process a file', function (next) {
        var output = [];

        var stream = new ParseStream(chunkResolver);
        stream.on('data', function (chunk) {
            output.push(chunk);
        });

        stream.on('finish', function () {
            var str = Buffer.concat(output).toString('utf8');
            assert.strictEqual(str, '<p>PRE</p><p>{@helper attr="value"/} {randomData}</p><p>PRE</p><p>PRE</p>');
            next();
        });

        fs.createReadStream('./test/templates/missing.dust').pipe(stream);
    });


    it('should handle a file regardless of size', function (next) {
        var output = [];

        var stream = new ParseStream(chunkResolver);
        stream.on('data', function (chunk) {
            output.push(chunk);
        });

        stream.on('finish', function () {
            var buffer = Buffer.concat(output);
            assert(buffer.toString('utf8'));
            assert.strictEqual(buffer.length, fs.statSync('./test/templates/largo.dust').size);
            next();
        });

        fs.createReadStream('./test/templates/largo.dust').pipe(stream);

    });

});