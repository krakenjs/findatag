/*global exports:true*/

'use strict';

var preHandlers = {
	'pre': function(data, args) {
		if ( args && args.hasOwnProperty('content') ) {
			return getObjectValue(args.content, data);
		}
		throw new Error("Pre tag requires a valid attribute.");
	}
};

function getObjectValue(str, obj) {
	return str.split('.').reduce(function(o, i){return o[i];}, obj);
}

// THIS NEEDS TO BE UNIT TESTABLE
// Guess I'll have to break it out of the top-level method next week
function parser(block, data) {
	var pos = 0, tag, attr={}, result;

	function adv() {
		pos++;
	}
	function parseBlock() {
		var result;
		// Ignore the open brace
		if ( block[pos] === '{' ) {
			adv();
		}
		// We have an @! There must be a tag, right?
		if ( block[pos] === '@' ) {
			adv();
			// Look for a valid tag
			tag = parseTag();
			if ( tag !== null ) {
				// If we don't have a handler for this tag, return the original string
				if ( !preHandlers.hasOwnProperty(tag) ) {
					return block;
				}
				// Look for attributes
				result = parseAttr();
				while ( result !== null ) {
					attr[result[0]] = result[1];
					result = parseAttr();
				}
				if ( attr !== null ) {
					return preHandlers[tag](data, attr);
				}
				return preHandlers[tag](data);
			}
			else {
				throw new Error("Invalid tagname");
			}
		}
		else {
			throw new Error("Malformed precompile tag block.");
		}
	}
	function parseTag() {
		var chr, result = [];
		chr = parseKey();
		while ( chr !== null ) {
			result.push(chr);
			adv();
			chr = parseKey();
		}
		return result.join('');
	}
	function parseAttr() {
		var chr, key = [], value = [];
		chr = parseWhite();
		while ( chr !== null ) {
			adv();
			chr = parseWhite();
		}
		chr = parseKey();
		while ( chr !== null ) {
			key.push(chr);
			adv();
			chr = parseKey();
		}
		chr = parseAttrJoiner('=');
		while ( chr !== null ) {
			adv();
			chr = parseAttrJoiner('=');
		}
		chr = parseWhite();
		while ( chr !== null ) {
			adv();
			chr = parseWhite();
		}
		chr = parseValue();
		while ( chr !== null ) {
			value.push(chr);
			adv();
			chr = parseValue();
		}
		if ( key.length > 0 && value.length > 0 ) {
			return [key.join(''), value.join('')];
		}
		return null;
	}
	function parseKey() {
		if ( /[a-zA-Z_]/.test(block[pos]) ) {
			return block[pos];
		}
		return null;
	}
	function parseValue() {
		if ( block[pos] === '"' || block[pos] === "'" ) {
			adv();
		}
		if ( /[a-zA-Z\.]/.test(block[pos]) ) {
			return block[pos];
		}
		return null;
	}
	function parseAttrJoiner(joinee) {
		var chr;
		chr = parseWhite();
		while ( chr !== null ) {
			adv();
			chr = parseWhite();
		}
		if ( block[pos] === joinee ) {
			adv();
		}
		return null;
	}
	function parseWhite() {
		if ( /\s/.test(block[pos]) ) {
			return block[pos];
		}
		return null;
	}

	return parseBlock();
}

exports = module.exports = {
	parse: function (str, data, callback) {
		var err, i, matches,
			preSearch = /{@([^}]*)?\/}/gi;

		matches = str.match(preSearch);
		try {
			for ( i=0; i < matches.length; i++ ) {
				str = str.replace(matches[i], parser(matches[i], data));
			}
		}
		catch (e) {
			err = e;
		}
		/*
		key = preTags[1].trim().split('=')[1].replace(/"/g, '')
		result = str.replace(preTags[0], getObjectValue(key,data));
		*/
		callback(err, str);
	}
};