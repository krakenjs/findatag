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

	/*
		Parses a string of dust template in an attempt to find any supported
		"pre" tags for precompilation. Looks for syntax like {@helper attr="value"/}
		to match our current helper syntax.
	*/
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

	// Walks the beginning of a helper tag to get the name
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

	// Walks through html-style attributes and gets a key/value pair to return
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

	// Walks what is defined as a valid key block for key/value pairs
	function parseKey() {
		if ( /[a-zA-Z_]/.test(block[pos]) ) {
			return block[pos];
		}
		return null;
	}

	// Walks what is defined as a valid value block for key/value pairs.. will need work
	function parseValue() {
		if ( block[pos] === '"' || block[pos] === "'" ) {
			adv();
		}
		if ( /[a-zA-Z\.]/.test(block[pos]) ) {
			return block[pos];
		}
		return null;
	}

	// Walks whitespace and a specific character until it finds neither
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

	// Walk the whitespace until we hit non-whitespace
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
		callback(err, str);
	}
};