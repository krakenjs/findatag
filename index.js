'use strict';

var fs = require('fs'),
    ParseStream = require('./lib/parseStream');


module.exports = {

    createParseStream: function (entityHandler) {
        return new ParseStream(entityHandler);
    },


    parse: function (file, entityHandler, callback) {
        var stream, chunks;

        stream = this.createParseStream(entityHandler);
        chunks = [];

        stream.on('data', function (chunk) {
            chunks.push(chunk);
        });

        stream.on('finish', function () {
            callback(null, Buffer.concat(chunks).toString('utf8'));
        });

        stream.on('error', callback);

        fs.createReadStream(file).pipe(stream);
    }

};