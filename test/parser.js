/*global describe:false, before:false, beforeEach:false, after:false, it:false*/
'use strict';

var assert = require('chai').assert,
    Parser = require('../lib/parser');

describe('parser', function () {

    var options = { tags: 'pre, call' };
    var parser;

    beforeEach(function () {
        parser = new Parser(options);
    });


    describe('end', function () {

        it('should write and close', function (next) {
            parser.once('end', next);
            parser.write('Test').close();
        });


        it('should support multiple writes', function (next) {
            parser.on('end', next);
            parser.write('test').write('foo').close();
        });


        it('should error on multiple closes', function () {
            var err;
            try {
                parser.write('test').close();
                parser.close();
            } catch (error) {
                err = error;
            } finally {
                assert.ok(err);
            }
        });

    });


    describe('text', function () {

        it('should emit text events', function (next) {
            var orig, chunk;

            orig = 'This is a text chunk.';

            parser.once('text', function (text) {
                chunk = text;
            });

            parser.once('end', function () {
                assert.strictEqual(orig, chunk);
                next();
            });

            parser.write(orig).close();
        });


        it('should emit multiple text events', function (next) {
            var orig, chunks;

            orig = 'This is a text {@pre/} chunk.';
            chunks = [];

            parser.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a text ');
                assert.strictEqual(chunks[1], ' chunk.');
                next();
            });

            parser.write(orig).close();
        });


        it('should emit multiple text events regardless of tags', function (next) {
            var orig, chunks;

            orig = 'This is a {@pre /} text {@pre/} chunk.';
            chunks = [];

            parser.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 3);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' text ');
                assert.strictEqual(chunks[2], ' chunk.');
                next();
            });

            parser.write(orig).close();
        });


        it('should ignore tag-like syntax', function (next) {
            var orig, chunks;

            orig = 'This, {} is an object {@} {@ } { @} { @ } {@/} {@ /} {@/ } {@!/} {@ whuh} literal.';
            chunks = [];

            parser.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 1);
                assert.strictEqual(chunks[0], 'This, {} is an object {@} {@ } { @} { @ } {@/} {@ /} {@/ } {@!/} {@ whuh} literal.');
                next();
            });

            parser.write(orig).close();
        });


//        it('should report malformed tags', function () {
//            var err;
//
//            try {
//                parser.write('Foo {@bar} baz').close();
//            } catch (error) {
//                err = error;
//            } finally {
//                assert.ok(err);
//            }
//
//            try {
//                parser.write('Foo {@bar } baz').close();
//            } catch (error) {
//                err = error;
//            } finally {
//                assert.ok(err);
//            }
//        });


        it('should ignore tag-like syntax combined with real tags', function (next) {
            var orig, chunks;

            orig = 'This, {@} is not an object literal {@!}{@pre/}.';
            chunks = [];

            parser.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This, {@} is not an object literal {@!}');
                assert.strictEqual(chunks[1], '.');
                next();
            });

            parser.write(orig).close();
        });


        it('should preserve correct state across multiple writes', function (next) {
            var orig1, orig2, chunks;

            orig1 = 'This, {@} is not an {@p';
            orig2 = 're/} object literal {@pre/}.';
            chunks = [];

            parser.on('text', function (text) {
                chunks.push(text);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 3);
                assert.strictEqual(chunks[0], 'This, {@} is not an ');
                assert.strictEqual(chunks[1], ' object literal ');
                assert.strictEqual(chunks[2], '.');
                next();
            });

            parser.write(orig1).write(orig2).close();
        });


    });


    describe('tag', function () {

        it('should support tags with no attributes but whitespace', function (next) {
            var orig, tag;

            orig = 'This is a {@pre /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.write(orig).close();
        });


        it('should emit a tag event for tags with no attributes but arbitrary whitespace', function (next) {
            var orig, tag;

            orig = 'This is a {@pre   /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.write(orig).close();
        });


        it('should support tags with no attributes or whitespace', function (next) {
            var orig, tag;

            orig = 'This is a {@pre/} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                next();
            });

            parser.write(orig).close();
        });


        it('should emit a tag event for tags with a quoted attribute', function (next) {
            var orig, tag;

            orig = 'This is a {@pre foo="bar"/} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                next();
            });

            parser.write(orig).close();
        });


        it('should emit a tag event for tags with quoted attributes', function (next) {
            var orig, tag;

            orig = 'This is a {@pre foo="bar"  baz="bam" /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                next();
            });

            parser.write(orig).close();
        });

        it('should emit a tag event for tags with quoted attributes using escapes', function (next) {
            var orig, tag;

// Double escape of backslash needed to get the right number into the processing code from the test environs.
            orig = 'This is a {@pre foo="b\\"ar"  baz="bam\\\\" /} chunk.';
            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'b"ar');
                assert.strictEqual(tag.attributes.baz, 'bam\\');
                next();
            });

            parser.write(orig).close();
        });


        it('should emit a tag event for tags with a attributes sans quotes', function (next) {
            var orig, tag;

            orig = 'This is a {@pre foo=bar baz=bam /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'bar');
                assert.strictEqual(tag.attributes.baz, 'bam');
                next();
            });

            parser.write(orig).close();
        });


        it('should support attributes without values', function (next) {
            var orig, tag;

            orig = 'This is a {@pre foo baz=bam /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'foo');
                assert.strictEqual(tag.attributes.baz, 'bam');
                next();
            });

            parser.write(orig).close();
        });


        it('should support dots (.) in attribute values', function (next) {
            var orig, tag;

            orig = 'This is a {@pre foo baz=foo.bam gar="whuh.no" /} chunk.';

            parser.once('tag', function (def) {
                tag = def;
            });

            parser.once('end', function () {
                assert.ok(tag);
                assert.strictEqual(tag.name, 'pre');
                assert.typeOf(tag.attributes, 'object');
                assert.strictEqual(tag.attributes.foo, 'foo');
                assert.strictEqual(tag.attributes.baz, 'foo.bam');
                assert.strictEqual(tag.attributes.gar, 'whuh.no');
                next();
            });

            parser.write(orig).close();
        });


        it('should parse multiple tags', function (next) {
            var orig, tags, chunks;

            orig = 'This is a {@pre foo baz=bam /}{@call me="maybe"/} chunk.';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
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

            parser.write(orig).close();
        });


        it('should parse only self-closing tags', function (next) {
            var orig, tags, chunks;

            orig = 'This is a {@default}{/default}{@helper } {@pre type="content" key="test"/} {/helper} {@stephen is="cool"} test {/stephen}.';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
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


            parser.write(orig).close();
        });


        it('should allow tags as attributes', function (next) {
            var orig, tags, chunks;

            orig = '{>foo name="{@pre type="content" key="test"/}"/}';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
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


            parser.write(orig).close();
        });


        it('should allow whitespace in quoted attributes', function (next) {
            var orig, tags, chunks;

            orig = 'This is a {@pre foo baz=bam sep=", " /}{@call me="maybe"/} chunk.';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
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

            parser.write(orig).close();
        });


        it('should not allow unclosed quoted attributes', function (next) {
            var orig, tags, chunks;

            orig = 'This is a {@pre bam=" /} chunk. {@pre foo="bar" /}';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
                assert.strictEqual(tags.length, 0);
                assert.strictEqual('This is a " /}', chunks.join(''));
                next();
            });

            parser.write(orig).close();
        });


        it('should not allow arbitrary quotes in unquoted attributes', function () {
            var orig, error;

            orig = 'This is a {@pre bam=baz"bam /}{@call me="maybe"/} chunk.';

            try {
                parser.write(orig).close();
            } catch (err) {
                error = err;
            } finally {
                assert.isObject(error);
            }
        });

        it('should allow any char in a quoted attribute value', function (next) {
            var orig, tags, chunks;

            orig = 'This is a {@pre bam="</li>" /} chunk.';
            tags = [];
            chunks = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.bam, '</li>');

                assert.strictEqual(chunks.length, 2);
                assert.strictEqual('This is a  chunk.', chunks.join(''));
                next();
            });

            parser.write(orig).close();
        });

    });


    describe('filter', function () {

        it('should parse only specified tags', function (next) {
            var orig, chunks, tags;

            orig = 'This is a {@pre baz=bam /} chunk {@howdy/}.';
            chunks = [];
            tags = [];

            parser.on('text', function (chunk) {
                chunks.push(chunk);
            });

            parser.on('tag', function (def) {
                tags.push(def);
            });

            parser.once('end', function () {
                assert.strictEqual(chunks.length, 2);
                assert.strictEqual(chunks[0], 'This is a ');
                assert.strictEqual(chunks[1], ' chunk {@howdy/}.');


                assert.strictEqual(tags.length, 1);
                assert.strictEqual(tags[0].name, 'pre');
                assert.typeOf(tags[0].attributes, 'object');
                assert.strictEqual(tags[0].attributes.baz, 'bam');
                next();
            });

            parser.write(orig).close();
        });

    });

});
