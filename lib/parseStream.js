/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay, Inc.                                              │
 │                                                                             │
 │   ,'""`.                                                                    │
 │  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
 │  |(@)(@)|  you may not use this file except in compliance with the License. │
 │  )  __  (  You may obtain a copy of the License at                          │
 │ /,'))((`.\                                                                  │
 │(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
 │ `\ `)(' /'                                                                  │
 │                                                                             │
 │   Unless required by applicable law or agreed to in writing, software       │
 │   distributed under the License is distributed on an "AS IS" BASIS,         │
 │   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │   See the License for the specific language governing permissions and       │
 │   limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var async = require('async'),
    objutil = require('objutil'),
    stream = require('readable-stream'),
    Parser = require('./parser');


function ParseStream(entityHandler) {
    ParseStream.super_.call(this);

    this._handler = entityHandler;
    this._queue = [];

    var parser = this._parser = new Parser({ tags: entityHandler.tags });
    parser.on('tag', this._queueTag.bind(this));
    parser.on('text', this._queueText.bind(this));
}


objutil.extend(ParseStream, stream.Transform, {

    get entityHandler () {
        return this._handler;
    },


    set entityHandler (value) {
        this._handler = value;
    },


    _queueTag: function (chunk) {
        var that = this;
        this._queue.push(function (cb) {
            that._handler.onTag(chunk, function (err, result) {
                that.push(result);
                cb(err);
            });
        });
    },


    _queueText: function (chunk) {
        var that = this;
        this._queue.push(function (cb) {
            if (that._handler.onText) {
                that._handler.onText(chunk, function (err, result) {
                    that.push(result);
                    cb(err);
                });
            } else {
                that.push(chunk);
                cb();
            }
        });
    },


    _transform: function (chunk, encoding, cb) {
        if (Buffer.isBuffer(chunk)) {
            encoding = 'utf8';
            chunk = chunk.toString(encoding);
        }

        var that = this;
        that._parser.once('end', function () {
            async.series(that._queue, function (err) {
                if (err) {
                    cb(err);
                    return;
                }
                that._parser.resume();
                that._queue = [];
                cb();
            });
        });
        that._parser.write(chunk).close();
    }

});

module.exports = ParseStream;


