'use strict';

var tatersalad = require('tatersalad'),
	async = require('async');
/*
	TODO: Come up with a short "spec" of what I'm doing here and how it's getting tokenized and parsed.
*/

/*
	Takes in a string (dot.style.object.path) and a javascript object
	e.g. {dot:{style:{object:{path:"value"}}}}
	And returns the value or "value" in this example
*/
function getObjectValue(str, obj) {
	return str.split('.').reduce( function(o, i) {
		return (o) ? o[i] : str;
	}, obj);
}


/*
	A list of types used to handle @pre prebuilding
	Could potentially handle images, urls, and whatever else
*/
var preHandlerTypes = {
	'content': function(viewName, args, callback) {
		if ( args && args.hasOwnProperty('key') ) {
			tatersalad.loadContent(viewName, args.locale, function(err, data) {
				callback(err, getObjectValue(args.key, data));
			});
		} else {
			throw new Error("@pre with type=\"content\" requires the key attribute");
		}
	}
};

/*
	A tokenizing parser
	Walks each character looking for expected patterns
	TODO: Improve unit testing
*/
var parser = {
	adv: function(p) {
		p.pos++;
	},

	/*
		Basic loop to walk over the entire string and look for
		valid @pre blocks
	*/
	run: function(viewName, templateStr, locale, callback) {
		var p = {pos: 0, str: templateStr, view: viewName, locale: locale},
			result = [];

		async.doWhilst(
			function(cb) {
				parser.parseBlock(p, function(err, content) {
					if ( err ) {
						callback(err, p.str);
					} else {
						result.push(content);
						cb();
					}
				});
			},
			function() { return p.pos < p.str.length; },
			function(err) {
				callback(err, result.join(''));
			}
		);
	},

	/*
		Parses a string of dust template in an attempt to find any supported
		"pre" tags for precompilation. Looks for syntax like {@pre type="content" key="index.header"/}
		to match our current helper syntax.
	*/
	parseBlock: function(p, callback) {
		var attrTemp = '',
			tagTemp = '',
			attr = {},
			tag = '',
			tagName = 'pre';
		// Ignore the open brace
		if ( p.str[p.pos] === '{' ) {
			tagTemp += p.str[p.pos];
			this.adv(p);
			// We have an @! There must be a tag, right?
			if ( p.str[p.pos] === '@' ) {
				tagTemp += p.str[p.pos];
				this.adv(p);
				// Look for a valid @pre tag
				tag = this.parseTag(p);
				if ( tag === tagName ) {
					// Look for attributes
					attrTemp = this.parseAttr(p);
					while ( attrTemp !== null ) {
						attr[attrTemp[0]] = attrTemp[1];
						attrTemp = this.parseAttr(p);
					}
					if ( attr && attr.hasOwnProperty('type') ) {
						attr.locale = p.locale;
						preHandlerTypes[attr.type](p.view, attr, function(err, data) {
							callback(err, data);
						});
					} else {
						throw new Error("@pre currently requires the type attribute");
					}
					do {
						this.adv(p);
					} while ( p.str[p.pos] !== '}' );

					this.adv(p);
				} else {
					// Parser ate the whitespace. Not sure what to do about that right now
					callback(null, tagTemp + tag + ' ');
					this.adv(p);
				}
			} else {
				callback(null, tagTemp);
			}
		} else {
			tagTemp = p.str[p.pos];
			this.adv(p);
			callback(null, tagTemp);
		}
	},

	// Walks the beginning of a helper tag to get the name
	parseTag: function(p) {
		var chr, temp = [];
		chr = this.parseKey(p);
		while ( chr !== null ) {
			temp.push(chr);
			this.adv(p);
			chr = this.parseKey(p);
		}
		return temp.join('');
	},

	/*
		Walks through html-style attributes and gets a key/value pair to return
		Markup is very whitespace forgiving, I try to do the same.

		It looks like a do-while would work, however parse methods are written
		to check the current character or desired set and don't automatically
		advance the position
	*/
	parseAttr: function(p) {
		var chr, key = [], value = [];
		chr = this.parseWhite(p);
		while ( chr !== null ) {
			this.adv(p);
			chr = this.parseWhite(p);
		}
		chr = this.parseKey(p);
		while ( chr !== null ) {
			key.push(chr);
			this.adv(p);
			chr = this.parseKey(p);
		}
		chr = this.parseAttrJoiner(p, '=');
		while ( chr !== null ) {
			this.adv(p);
			chr = this.parseAttrJoiner(p, '=');
		}
		chr = this.parseWhite(p);
		while ( chr !== null ) {
			this.adv(p);
			chr = this.parseWhite(p);
		}
		chr = this.parseValue(p);
		while ( chr !== null ) {
			value.push(chr);
			this.adv(p);
			chr = this.parseValue(p);
		}
		if ( key.length > 0 && value.length > 0 ) {
			return [key.join(''), value.join('')];
		}
		return null;
	},

	// Walks what is defined as a valid key block for key/value pairs
	parseKey: function(p) {
		if ( /[a-zA-Z_]/.test(p.str[p.pos]) ) {
			return p.str[p.pos];
		}
		return null;
	},

	// Walks what is defined as a valid value block for key/value pairs.. will need work
	parseValue: function(p) {
		if ( p.str[p.pos] === '"' || p.str[p.pos] === "'" ) {
			this.adv(p);
		}
		if ( /[a-zA-Z\.]/.test(p.str[p.pos]) ) {
			return p.str[p.pos];
		}
		return null;
	},

	// Walks whitespace and a specific character until it finds neither
	parseAttrJoiner: function(p, joinee) {
		var chr;
		chr = this.parseWhite(p);
		while ( chr !== null ) {
			this.adv(p);
			chr = this.parseWhite(p);
		}
		if ( p.str[p.pos] === joinee ) {
			this.adv(p);
		}
		return null;
	},

	// Walk the whitespace until we hit non-whitespace
	parseWhite: function(p) {
		if ( /\s/.test(p.str[p.pos]) ) {
			return p.str[p.pos];
		}
		return null;
	}
}


exports = module.exports = {
	config: function (tatersaladConfig) {
		tatersalad.configure(tatersaladConfig || {});
	},

	parse: parser.run
};