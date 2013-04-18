'use strict';

var async = require('async'),
    objutil = require('objutil'),
    stream = require('readable-stream'),
    Parser = require('./parser');


function ParseStream(resolver) {
    ParseStream.super_.call(this, { decodeStrings: false });

    this._resolver = resolver;
    this._queue = [];

    var parser = this._parser = new Parser({ tags: resolver.tags });
    parser.on('tag', this._queueTag.bind(this));
    parser.on('text', this._queueText.bind(this));

}


objutil.extend(ParseStream, stream.Transform, {

    _queueTag: function (chunk) {
        var that = this;
        this._queue.push(function (cb) {
            that._resolver.onTag(chunk, function (err, result) {
                that.push(result);
                cb(err);
            });
        });
    },


    _queueText: function (chunk) {
        var that = this;
        this._queue.push(function (cb) {
            that._resolver.onText(chunk, function (err, result) {
                that.push(result);
                cb(err);
            });
        });
    },


    _transform: function (chunk, encoding, cb) {
        if (Buffer.isBuffer(chunk)) {
            chunk = chunk.toString(encoding || 'utf8');
        }

        var that = this;
        that._parser.once('end', function () {
            async.series(that._queue, function () {
                that._parser.resume();
                that._queue = [];
                cb();
            });
        });
        that._parser.write(chunk).close();
    }

});

module.exports = ParseStream;


