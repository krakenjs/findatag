/*global describe:false, it:false*/
'use strict';

var assert = require('chai').assert,
    findatag = require('..'),
    events = require('events');

describe('parser', function () {

    var ee = new events.EventEmitter();
    var options = {
        tags: 'pre, call',
        onTag: function (tag, cb) {
            ee.emit('tag', tag);
            cb(null, '');
        },
        onText: function (text, cb) {
            ee.emit('text', text);
            cb(null, text);
        }
    };

    describe('finish', function () {

        it('should write and close', function (next) {
            var parser = findatag.createParseStream(options);
            parser.once('finish', next);
            parser.end('Test');
        });


        it('should support multiple writes', function (next) {
            var parser = findatag.createParseStream(options);
            parser.on('finish', next);
            parser.write('test');
            parser.end('foo');
        });

    });


    describe('text', function () {

        it('should emit text events', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunk;

            ee = new events.EventEmitter();

            orig = 'This is a text chunk.';

            ee.once('text', function (text) {
                chunk = text;
            });

            parser.once('finish', function () {
                assert.strictEqual(orig, chunk);
                next();
            });

            parser.end(orig);
        });


        it('should emit multiple text events', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunks;

            orig = 'This is a text {@pre/} chunk.';
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a text ');
                assert.strictEqual(chunks[1], ' chunk.');
                next();
            });

            parser.end(orig);
        });


        it('should emit multiple text events regardless of tags', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunks;

            orig = 'This is a {@pre /} text {@pre/} chunk.';
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 3);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' text ');
                assert.strictEqual(chunks[2], ' chunk.');
                next();
            });

            parser.end(orig);
        });


        it('should ignore tag-like syntax', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunks;

            orig = 'This, {} is an object {@} {@ } { @} { @ } {@/} {@ /} {@/ } {@!/} {@ whuh} literal.';
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 1);
                assert.strictEqual(chunks[0], 'This, {} is an object {@} {@ } { @} { @ } {@/} {@ /} {@/ } {@!/} {@ whuh} literal.');
                next();
            });

            parser.end(orig);
        });


//        it('should report malformed tags', function () {
//            var err;
//
//            try {
//                parser.end('Foo {@bar} baz');
//            } catch (error) {
//                err = error;
//            } finally {
//                assert.ok(err);
//            }
//
//            try {
//                parser.end('Foo {@bar } baz');
//            } catch (error) {
//                err = error;
//            } finally {
//                assert.ok(err);
//            }
//        });


        it('should ignore tag-like syntax combined with real tags', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunks;

            orig = 'This, {@} is not an object literal {@!}{@pre/}.';
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This, {@} is not an object literal {@!}');
                assert.strictEqual(chunks[1], '.');
                next();
            });

            parser.end(orig);
        });


        it('should preserve correct state across multiple writes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig1, orig2, chunks;

            orig1 = 'This, {@} is not an {@p';
            orig2 = 're/} object literal {@pre/}.';
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 3);
                assert.strictEqual(chunks[0], 'This, {@} is not an ');
                assert.strictEqual(chunks[1], ' object literal ');
                assert.strictEqual(chunks[2], '.');
                next();
            });

            parser.write(orig1);
            parser.end(orig2);
        });


    });


    describe('tag', function () {

        it('should support tags with no attributes but whitespace', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.end(orig);
        });


        it('should emit a tag event for tags with no attributes but arbitrary whitespace', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre   /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.end(orig);
        });


        it('should support tags with no attributes or whitespace', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre/} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.end(orig);
        });


        it('should emit a tag event for tags with a quoted attribute', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre foo="bar"/} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                next();
            });

            parser.end(orig);
        });

        it('should emit a tag event for tags with a quoted attribute containing a single quote', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = "This is a {@pre foo=\"don't\"/} chunk.";

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, "don't");
                next();
            });

            parser.end(orig);
        });


        it('should emit a tag event for tags with quoted attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre foo="bar"  baz="bam" /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                next();
            });

            parser.end(orig);
        });

        it('should emit a tag event for tags with quoted attributes using escapes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

// Double escape of backslash needed to get the right number into the processing code from the test environs.
            orig = 'This is a {@pre foo="b\\"ar"  baz="bam\\\\" /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'b"ar');
                assert.strictEqual(tag.attributes.baz, 'bam\\');
                next();
            });

            parser.end(orig);
        });

        it('should emit a tag event for tags with quoted attributes using escapes and handle control chars', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

// Double escape of backslash needed to get the right number into the processing code from the test environs.
            orig = 'This is a {@pre foo="b\\tar"  baz="b\\bam" /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'b\tar');
                assert.strictEqual(tag.attributes.baz, 'b\bam');
                next();
            });

            parser.end(orig);
        });

        it('should emit a tag event for tags with a attributes sans quotes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre foo=bar baz=bam /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                assert.strictEqual(tag.attributes.baz, 'bam');
                next();
            });

            parser.end(orig);
        });


        it('should support attributes without values', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre foo baz=bam /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'foo');
                assert.strictEqual(tag.attributes.baz, 'bam');
                next();
            });

            parser.end(orig);
        });


        it('should support dots (.) in attribute values', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tag;

            orig = 'This is a {@pre foo baz=foo.bam gar="whuh.no" /} chunk.';

            ee = new events.EventEmitter();

            ee.once('tag', function (def) {
                tag = def;
            });

            parser.once('finish', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'foo');
                assert.strictEqual(tag.attributes.baz, 'foo.bam');
                assert.strictEqual(tag.attributes.gar, 'whuh.no');
                next();
            });

            parser.end(orig);
        });


        it('should parse multiple tags', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = 'This is a {@pre foo baz=bam /}{@call me="maybe"/} chunk.';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                assert.strictEqual(tags.length, 2);

                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.foo, 'foo');
                assert.strictEqual(tags[0].attributes.baz, 'bam');

                assert.strictEqual(tags[1].name, 'call');
                assert.typeOf(tags[1].attributes, 'object');
                assert.strictEqual(tags[1].attributes.me, 'maybe');


                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' chunk.');

                next();
            });

            parser.end(orig);
        });


        it('should parse only self-closing tags', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = 'This is a {@default}{/default}{@helper } {@pre type="content" key="test"/} {/helper} {@stephen is="cool"} test {/stephen}.';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                var result = chunks.join('');

                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.type, 'content');
                assert.strictEqual(tags[0].attributes.key, 'test');

                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a {@default}{/default}{@helper } ');
                assert.strictEqual(chunks[1], ' {/helper} {@stephen is="cool"} test {/stephen}.');
                assert.strictEqual(result, 'This is a {@default}{/default}{@helper }  {/helper} {@stephen is="cool"} test {/stephen}.');

                next();
            });


            parser.end(orig);
        });


        it('should allow tags as attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = '{>foo name="{@pre type="content" key="test"/}"/}';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                var result = chunks.join('');

                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.type, 'content');
                assert.strictEqual(tags[0].attributes.key, 'test');

                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], '{>foo name="');
                assert.strictEqual(chunks[1], '"/}');
                assert.strictEqual(result, '{>foo name=""/}');

                next();
            });


            parser.end(orig);
        });


        it('should allow whitespace in quoted attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = 'This is a {@pre foo baz=bam sep=", " /}{@call me="maybe"/} chunk.';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                assert.strictEqual(tags.length, 2);

                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.foo, 'foo');
                assert.strictEqual(tags[0].attributes.baz, 'bam');
                assert.strictEqual(tags[0].attributes.sep, ', ');

                assert.strictEqual(tags[1].name, 'call');
                assert.typeOf(tags[1].attributes, 'object');
                assert.strictEqual(tags[1].attributes.me, 'maybe');


                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' chunk.');

                next();
            });

            parser.end(orig);
        });


        it('should not allow unclosed quoted attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = 'This is a {@pre bam=" /} chunk. {@pre foo="bar" /}';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                assert.strictEqual(tags.length, 0);
                assert.strictEqual('This is a " /}', chunks.join(''));
                next();
            });

            parser.end(orig);
        });


        it('should not allow arbitrary quotes in unquoted attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig;

            orig = 'This is a {@pre bam=baz"bam /}{@call me="maybe"/} chunk.';

            parser.on('error', function(error) {
                assert.isObject(error);
                next();
            });

            parser.end(orig);
        });

        it('should not allow single quoting in attributes', function (next) {
            var parser = findatag.createParseStream(options);
            var orig;

            orig = "This is a {@pre bam=baz='bam' /} chunk.";

            parser.on('error', function (error) {
                assert.isObject(error);
                next();
            });

            parser.end(orig);
        });

        it('should allow any char in a quoted attribute value', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, tags, chunks;

            orig = 'This is a {@pre bam="</li>" /} chunk.';
            tags = [];
            chunks = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.bam, '</li>');

                assert.strictEqual(chunks.length, 2);
                assert.strictEqual('This is a  chunk.', chunks.join(''));
                next();
            });

            parser.end(orig);
        });

    });


    describe('filter', function () {

        it('should parse only specified tags', function (next) {
            var parser = findatag.createParseStream(options);
            var orig, chunks, tags;

            orig = 'This is a {@pre baz=bam /} chunk {@howdy/}.';
            chunks = [];
            tags = [];

            ee = new events.EventEmitter();

            ee.on('text', function (chunk) {
                chunks.push(chunk);
            });

            ee.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('finish', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' chunk {@howdy/}.');


                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.baz, 'bam');
                next();
            });

            parser.end(orig);
        });

    });

});
