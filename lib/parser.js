/***@@@ BEGIN LICENSE @@@***
Copyright (c) 2013, eBay Software Foundation All rights reserved.  Use of the accompanying software, in source and binary forms, is permitted without modification only and provided that the following conditions are met:  Use of source code must retain the above copyright notice, this list of conditions and the following disclaimer.  Use in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.  Neither the name of eBay or its subsidiaries nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.  All rights not expressly granted to the recipient in this license are reserved by the copyright holder.  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
***@@@ END LICENSE @@@***/
'use strict';

var util = require('util'),
    events = require('events');

var ORD = 0;

function createDict(str, del) {
    return str && Object.freeze(str.split(del || '').reduce(function (s, c) {
        s[c] = true;
        return s;
    }, {}));
}


function Parser(options) {
    var tags;
    options = options || {};
    this._state = Parser.State.BEGIN;
    this._closed = false;

    tags = options.tags;
    if (Array.isArray(tags)) {
        tags = tags.join(',');
    }

    this._tags = createDict(tags, /\s*,\s*/g);
    this._textNode = '';
    this._tagName = '';
    this._attributeName = '';
    this._attributeValue = '';
    this._attributes = {};
}


Parser.State = {
    BEGIN:        ORD++,
    TEXT:         ORD++,
    OPEN_CHAR:    ORD++,
    OPEN_TAG:     ORD++,
    ATTRIB:       ORD++,
    ATTRIB_NAME:  ORD++,
    ATTRIB_VALUE: ORD++,
    QUOTED_ATTRIB_VALUE: ORD++,
    QUOTED_ATTRIB_VALUE_ESCAPE: ORD++,
    CLOSE_TAG:    ORD++
};


Parser.CharSet = {
    WHITESPACE: createDict('\n\r\t '),
    ESCAPEABLE_CONTROL_CHARS: createDict('bfnrtv'), 
    ALPHANUM:   createDict('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890._')
};


util.inherits(Parser, events.EventEmitter);


Parser.prototype._is = function (charSet, character) {
    return charSet[character];
};


Parser.prototype._closeText = function () {
    if (this._textNode) {
        this.emit('text', this._textNode);
        this._textNode = '';
    }
};


Parser.prototype._closeTag = function () {
    if (this._tagName) {
        this.emit('tag', {
            name: this._tagName,
            attributes: this._attributes
        });
    }
};


Parser.prototype.write = function (chunk) {
    var i, c, S;
    var escCharMap = {"b":"\x08", "f":"\x0C", "n":"\x0A", "r":"\x0D", "t":"\x09", "v":"\x0B"};

    if (this._closed) {
        this.emit(new Error('Cannot write after close.'));
        return this;
    }

    if (chunk === null) {
        return this.end();
    }

    i = 0;
    S = Parser.State;


    while (c = chunk.charAt(i++)) {

        switch (this._state) {
        case S.BEGIN:
            this._textNode = '';
            this._state = S.TEXT;
            // XXX: Intentionally fall through

            /* falls through */
        case S.TEXT:
            this._tagName = '';
            this._attributeName = '';
            this._attributeValue = '';
            this._attributes = {};

            if (c === '{') {
                this._state = S.OPEN_CHAR;
            } else {
                this._textNode += c;
            }
            break;

        case S.OPEN_CHAR:
            if (c === '@') {
                this._state = S.OPEN_TAG;
            } else {
                // Revert back to text state, including the previously skipped '{'
                this._state = S.TEXT;
                this._textNode += '{' + c;
            }
            break;

        case S.OPEN_TAG:
            if (this._is(Parser.CharSet.ALPHANUM, c)) {
                this._tagName += c;

            } else if (this._is(Parser.CharSet.WHITESPACE, c)) {
                if (this._tagName && (!this._tags || this._tags[this._tagName])) {
                    // Officially a tag so notify end of text node.
                    this._state = S.ATTRIB;
                } else {
                    // Revert back to text state, including the character and continuing as text node.
                    this._textNode += '{@' + this._tagName + c;
                    this._state = S.TEXT;
                }

            } else if (c === '/') {
                if (this._tagName && (!this._tags || this._tags[this._tagName])) {
                    // It's a tag w/ no attrs so close the prev textNode and initiate close
                    this._closeText();
                    this._state = S.CLOSE_TAG;
                } else {
                    // Not a tag, but we got here somehow, so just add tag-like chars
                    this._textNode += '{@' + this._tagName + c;
                    this._state = S.TEXT;
                }

            } else if (c === '}') {
                // Symmetrical tag, so ignore
                this._textNode += '{@' + this._tagName + c;
                this._state = S.TEXT;

            } else {
                if (this._tagName) {
                    throw new Error('Malformed tag. Tag not closed correctly.');
                } else {
                    // Hit a character that's not valid in a tag, so put together what we've found so far and
                    // continue as text node.
                    this._textNode += '{@' + this._tagName + c;
                    this._state = S.TEXT;
                }
            }
            break;

        case S.ATTRIB:
            if (this._is(Parser.CharSet.ALPHANUM, c)) {
                this._attributeName = c;
                this._attributeValue = '';
                this._state = S.ATTRIB_NAME;

            } else if (this._is(Parser.CharSet.WHITESPACE, c)) {
                // noop

            } else if (c === '/') {
                this._closeText();
                this._state = S.CLOSE_TAG;

            } else {
                throw new Error('Malformed tag. Tag not closed correctly.');
            }
            break;

        case S.ATTRIB_NAME:
            if (this._is(Parser.CharSet.ALPHANUM, c)) {
                this._attributeName += c;

            } else if (this._is(Parser.CharSet.WHITESPACE, c)) {
                if (this._attributeName) {
                    this._attributes[this._attributeName] = this._attributeName;
                }
                this._state = S.ATTRIB;

            } else if (c === '=') {
                this._state = S.ATTRIB_VALUE;

            } else if (c === '/') {
                if (this._attributeName) {
                    this._attributes[this._attributeName] = this._attributeName;
                }
                this._state = S.CLOSE_TAG;

            } else {
                this._textNode += c;
                this._state = S.TEXT;
            }
            break;

        case S.QUOTED_ATTRIB_VALUE:
            if (c === '"') {
                this._attributes[this._attributeName] = this._attributeValue;
                this._state = S.ATTRIB;
            } else if (c === '\\') {
                this._state = S.QUOTED_ATTRIB_VALUE_ESCAPE;
            } else {
                this._attributeValue += c;
            }
            break;

        case S.QUOTED_ATTRIB_VALUE_ESCAPE:
            // Only control chars must be mapped to different codes.
            if (this._is(Parser.CharSet.ESCAPEABLE_CONTROL_CHARS, c)) {
                this._attributeValue += escCharMap[c];
            } else {
                this._attributeValue += c;
            }
            this._state = S.QUOTED_ATTRIB_VALUE;
            break;

        case S.ATTRIB_VALUE:
            if (c === '/') {
                this._attributes[this._attributeName] = this._attributeValue;
                this._state = S.CLOSE_TAG;

            } else if (c === '"') {
                if (!this._attributeValue) {
                    this._state = S.QUOTED_ATTRIB_VALUE;
                } else {
                    throw new Error('Malformed tag. Invalid quote.');
                }

            } else if (this._is(Parser.CharSet.WHITESPACE, c)) {
                if (this._attributeValue) {
                    this._attributes[this._attributeName] = this._attributeValue;
                    this._state = S.ATTRIB;
                }

            } else {
                this._attributeValue += c;
            }
            break;

        case S.CLOSE_TAG:
            if (c === '}') {
                this._closeTag();
                this._state = S.TEXT;
            }
            break;
        }
    }
    return this;
};


Parser.prototype.resume = function () {
    this._closed = false;
    return this;
};


Parser.prototype.end = function () {
    this._closed = true;
    this.emit('end');
    return this;
};


Parser.prototype.close = function () {
    if (this._closed) {
        throw new Error('Cannot write after close.');
    }
    this._closeText();
    return this.end();
};


module.exports = Parser;
