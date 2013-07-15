'use strict';

var fs = require('fs'),
    ParseStream = require('./lib/parseStream');


module.exports = {

    createParseStream: function (entityHandler) {
        return new ParseStream(entityHandler);
    },


    parse: function (file, entityHandler, callback) {
        var readStream, parseStream, chunks;

        chunks = [];

        // Create file read stream and deal with errors
        readStream = fs.createReadStream(file);
        readStream.on('error', callback);

        // Create parse stream, handle data events and errors
        parseStream = this.createParseStream(entityHandler);
        parseStream.on('error', callback);

        parseStream.on('data', function (chunk) {
            chunks.push(chunk);
        });

        parseStream.on('finish', function () {
            callback(null, Buffer.concat(chunks).toString('utf8'));
        });


        // Start processing
        readStream.pipe(parseStream);
    }

};