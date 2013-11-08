/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
'use strict';

var util = require('util'),
    async = require('async'),
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

util.inherits(ParseStream, stream.Transform);


ParseStream.prototype.__defineGetter__('entityHandler', function () {
    return this._handler;
});


ParseStream.prototype.__defineSetter__('entityHandler', function (value) {
    this._handler = value;
});


ParseStream.prototype._queueTag = function (chunk) {
    var that = this;
    this._queue.push(function (cb) {
        that._handler.onTag(chunk, function (err, result) {
            that.push(result);
            cb(err);
        });
    });
};


ParseStream.prototype._queueText = function (chunk) {
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
};


ParseStream.prototype._transform = function (chunk, encoding, cb) {
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
};


module.exports = ParseStream;


