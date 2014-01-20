'use strict';

var cssParse = require('css-parse');

function escapeRegExp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/* Simple matcher, don't bind, used for pseudoclass and attributes matchers */

function SimpleMatcher(predicate) {
	this.predicate = predicate;
}

SimpleMatcher.prototype.match = function(cur) {
	return this.predicate(cur);
};

SimpleMatcher.prototype.bind = function() {
};

SimpleMatcher.prototype.addSpecificityTo = function(dest) {
	dest[1]++;
};

var alwaysTrueMatcher = new SimpleMatcher(alwaysTrue);
var alwaysFalseMatcher = new SimpleMatcher(alwaysFalse);

/* Not matcher, specificity as pseudo element, do not bind, proxy specificity */

function NotMatcher(matcher) {
	this.matcher = matcher;
}

NotMatcher.prototype.match = function(cur) {
	return !this.matcher.match(cur);
};

NotMatcher.prototype.bind = function() {
};

NotMatcher.prototype.addSpecificityTo = function(dest) {
	dest[1]++;
	this.matcher.addSpecificityTo(dest);
};

function IdMatcher(id) {
	this.id = id;
}

IdMatcher.prototype.match = function(cur) {
	return cur.id == this.id;
};

IdMatcher.prototype.bind = function(css, rule) {
	css.bindRuleById(rule, this.id);
	return true;
};

IdMatcher.prototype.addSpecificityTo = function(dest) {
	dest[0]++;
};

function TagMatcher(tag) {
	this.tag = tag;
}

TagMatcher.prototype.match = function(cur) {
	return cur.tag == this.tag;
};

TagMatcher.prototype.bind = function(css, rule) {
	css.bindRuleByTag(rule, this.tag);
	return true;
};

TagMatcher.prototype.addSpecificityTo = function(dest) {
	dest[2]++;
};

function ClassMatcher(clazz) {
	this.clazz = clazz;
}

ClassMatcher.prototype.match = function(cur) {
	return cur.classes && cur.classes.indexOf(this.clazz) >= 0;
};

ClassMatcher.prototype.bind = function(css, rule) {
	css.bindRuleByClass(rule, this.clazz);
	return true;
};

ClassMatcher.prototype.addSpecificityTo = SimpleMatcher.prototype.addSpecificityTo;

function alwaysTrue() {
	return true;
}

function alwaysFalse() {
	return false;
}

function attributePredicate(name, comp, value) {
	if (value && value[0] == '"' && value[value.length - 1] == '"') {
		value = value.substring(1, value.length - 1);
	}
	if (!comp) {
		return function(cur) {
			return cur.attributes.hasOwnProperty(name);
		};
	}
	if (comp == '=') {
		return function(cur) {
			return cur.attributes.hasOwnProperty(name) && (!value || cur.attributes[name] == value);
		};
	}
	if (comp == '~=') {
		return function(cur) {
			var av = cur.attributes[name];
			return !!av && av.split(/\s+/).indexOf(value) >= 0;
		};
	}
	if (comp == '|=') {
		return function(cur) {
			var av = cur.attributes[name];
			return !!av && (av == value || av.indexOf(value + '-') >= 0);
		};
	}
	var pattern;
	var safe = escapeRegExp(value);
	switch(comp) {
		case '^=': pattern = new RegExp('^' + safe); break;
		case '$=': pattern = new RegExp(safe + '$'); break;
		case '*=': pattern = new RegExp('.*' + safe + '.*'); break;
		default: throw new Error('Unknown attribute comparision: ' + comp);
	}
	return function (cur) {
		var av = cur.attributes[name];
		return !!av && pattern.test(av);
	};
}

function AllMatcher(list) {
	/* Eliminate matcher in trivial situations */
	if (!list || list.length === 0) {
		return alwaysTrueMatcher;
	}
	if (list.length == 1) {
		return list[0];
	}
	this.list = list;
}

AllMatcher.prototype.match = function(cur) {
	var list = this.list;
	for (var i = 0; i < list.length; i++) {
		if (!list[i].match(cur)) {
			return false;
		}
	}
	return true;
};

AllMatcher.prototype.bind = function(css, rule) {
	for (var i = 0; i < this.list.length; i++) {
		if (this.list[i].bind(css, rule)) {
			return true;
		}
	}
	return false;
};

AllMatcher.prototype.addSpecificityTo = function(dest) {
	var list = this.list;
	for (var i = 0; i < list.length; i++) {
		list[i].addSpecificityTo(dest);
	}
};



function firstChild(cur) {
	return !cur.prev;
}

function lastChild(cur) {
	return !cur.next;
}

function nthIndex(k, i, index) {
	if (k === 0) {
		return index == i;
	}
	return k * (index - i) >= 0 && (index - i) % k == 0;
}

function nthChild(k, i) {
	return function(cur) {
		return nthIndex(k, i, cur.index);
	};
}

function nthLastChild(k, i) {
	return function(cur) {
		return nthIndex(k, i, cur.parent.childrenCount - cur.index + 1);
	};
}

function nthOfType(k, i) {
	return function(cur) {
		return nthIndex(k, i, cur.indexOfType);
	};
}

function onlyChild(cur) {
	return firstChild(cur) && lastChild(cur);
}

function onlyOfType(cur) {
	return firstOfType(cur) && lastOfType(cur);
}

function root(cur) {
	return !cur.parent || cur.parent.root;
}

function empty(cur) {
	return cur.children.length == 0;
}

function lastOfType(cur) {
	return cur.lastOfType;
}

function firstOfType(cur) {
	return cur.indexOfType == 0;
}

var PSEUDO_PREDICATES = {
	'first-child': firstChild,
	'last-child': lastChild,
	'nth-child(even)': nthChild(2, 0),
	'nth-child(odd)': nthChild(2, 1),
	'nth-last-child(even)': nthLastChild(2, 0),
	'nth-last-child(odd)': nthLastChild(2, 1),
	'only-child': onlyChild,
	'root': root,
	'empty': empty,
	'first-of-type': firstOfType,
	'last-of-type': lastOfType,
	'nth-of-type(even)': nthOfType(2, 0),
	'nth-of-type(odd)': nthOfType(2, 1),
	'only-of-type': onlyOfType,
	'required': function required(cur) {
		return cur.tag == 'input' && cur.attributes.required == 'required';
	},
	'optional': function optional(cur) {
		return cur.tag == 'input' && cur.attributes.required != 'required';
	},
	'link': alwaysTrue, // All links are treated as unvisited
	/* pseudo class returns always true, the are processed in a special manner */
	'before':alwaysTrue,
	'after':alwaysTrue,
	/* ignore dynamic pseudo classes */
	'hover':alwaysFalse,
	'visited':alwaysFalse,
	'valid':alwaysFalse,
	'active':alwaysFalse,
	'focus':alwaysFalse,
	'lang':alwaysFalse
};

function pseudoClassMatcher(name, full) {
	if (!name) {
		return alwaysTrueMatcher;
	}
	if (PSEUDO_PREDICATES.hasOwnProperty(name)) {
		return new SimpleMatcher(PSEUDO_PREDICATES[name]);
	}
	if (/^not\((.*)\)$/.test(name)) {
		return new NotMatcher(compileCssSelectorBasicBlock(RegExp.$1));
	}
	if (/^nth-child\((.*)\)$/.test(name)) {
		return new SimpleMatcher(nthChild.apply(null, parseNthOf(RegExp.$1)));
	}
	if (/^nth-last-child\((.*)\)$/.test(name)) {
		return new SimpleMatcher(nthLastChild.apply(null, parseNthOf(RegExp.$1)));
	}
	if (/^nth-of-type\((.*)\)$/.test(name)) {
		return new SimpleMatcher(nthOfType.apply(null, parseNthOf(RegExp.$1)))	;
	}
	/* Ignore all browser-specific classes */
	if (/^-(webkit|ms|moz)/.test(name)) {
		return alwaysFalseMatcher;
	}
	console.warn('Unsupported pseudo class: ' + name + ' in :' + full);
	return alwaysFalseMatcher;
}

function parseNthOf(content) {
	if (/^[+-]?\d+$/.test(content)) {
		return [0, content | 0];
	}
	if (/^([+-]?\d+)\w+([+-]\d+)?$/.test(content)) {
		return [RegExp.$1 | 0, RegExp.$2 | 0];
	}
	if (/^([+-]?)\w+([+-]\d+)?$/.test(content)) {
		return [(RegExp.$1 + '1') | 1, RegExp.$2 | 0];
	}
	throw new Error('Invalid nth syntax: ' + content);
}

/* Abstract search matcher that matches both div div, div>div and div ~ div, div + div syntax */

function SearchMatcher(iter, parts) {
	/* Eliminate search matrcher for trivial situations */
	/* when it is empty */
	if (parts.length === 0) {
		return alwaysTrueMatcher;
	}
	/* and when it is just one element like div.myclass */
	if (parts.length === 1 && parts[0].length === 1) {
		return parts[0][0];
	}
	this.parts = parts;
	this.iter = iter;
}

SearchMatcher.prototype.match = function _SearchMatcher_match(cur) {
	var parts = this.parts;
	var iter = this.iter;
	if (!partMatches(parts[0])) {
		return false;
	}
	for (var i = 1; i < parts.length && cur;) {
		var part = parts[i];
		if (partMatches(part, i == 0 ? 1 : 0)) {
			i++;
		} else {
			cur = iter(cur);
		}
	}
	return i == parts.length;
	
	/* Match direct sibling block */
	function partMatches(part) {
		var savedCur = cur;
		for (var j = 0; j < part.length && savedCur; j++) {
			if (!part[j].match(savedCur)) {
				return false;
			}
			savedCur = iter(savedCur);
		}
		if (j == part.length) {
			cur = savedCur;
			return true;
		}
		return false;
	}
};

SearchMatcher.prototype.bind = function(css, rule) {
	for (var i = 0; i < this.parts.length; i++) {
		var part = this.parts[i];
		for (var j = 0; j < part.length;  j++) {
			if (part[j].bind(css, rule)) {
				return true;
			}
		}
	}
	return false;
};

SearchMatcher.prototype.addSpecificityTo = function(dest) {
	for (var i = 0; i < this.parts.length; i++) {
		var part = this.parts[i];
		for (var j = 0; j < part.length;  j++) {
			part[j].addSpecificityTo(dest);
		}
	}
};

function toParentIterator(cur) {
	return cur.parent;
}

function toPrevIterator(cur) {
	return cur.prev;
}

function compileCssSelectorBasicBlock(block) {
	var original = block;
	var matchers = [];
	parseBasicBlock(block, {
		id: function (id) {
			matchers.push(new IdMatcher(id));
		},
		class: function (name) {
			matchers.push(new ClassMatcher(name));
		},
		attr: function (content) {
			if (/^[^\~\*\|\^\$\=]+$/.test(content)) {
				matchers.push(new SimpleMatcher(attributePredicate(content)));
			} else if (/^([^\~\*\|\^\$\=]+)([\~\*\|\^\$]?=)\"?([^"]*)\"?$/.test(content)) {
				matchers.push(new SimpleMatcher(attributePredicate(RegExp.$1, RegExp.$2, RegExp.$3)));
			} else {
				throw new Error('Invalid attribute selector: ' + block);
			}
		},
		tag: function (tag) {
			if (tag != '*') {
				matchers.push(new TagMatcher(tag));
			}
		},
		pseudo: function(name) {
			matchers.push(pseudoClassMatcher(name, original));
		}
	});
	return new AllMatcher(matchers);
}

function parseBasicBlock(text, callbacks) {
	var started = 0;
	var startedType = 'tag';
	var braces  = 0;
	var brackets = 0;
	for (var i = 0; i < text.length; i++) {
		var topLevel = braces === 0 && brackets === 0;
		if (topLevel) {
			switch(text[i]) {
				case '[':
					checkWhatStarted();
					started = i + 1;
					startedType = 'attr';
					brackets++;
					break;
				case ':':
					checkWhatStarted();
					started = i + (text[i + 1] == ':' ? 2 : 1);
					startedType = 'pseudo';
					break;
				case '#':
					checkWhatStarted();
					started = i + 1;
					startedType = 'id';
					break;
				case '.':
					checkWhatStarted();
					started = i + 1;
					startedType = 'class';
					break;
				default:
					if (i == 0) {
						startedType = 'tag';
						started = i;
					}
			}
		}
		switch(text[i]) {
			case ']':
				brackets--;
				if (brackets == 0) {
					checkWhatStarted();
				}
				break;
			case '(': braces++; break;
			case ')': braces--; break;
		}
	}
	checkWhatStarted();

	function checkWhatStarted() {
		if (started >= 0 && brackets == 0 && braces == 0) {
			if (started < i) {
				callbacks[startedType](text.substring(started, i));
			}
			started = -1;
		}
	}
}

function compileCssSelector(selector) {
	selector = selector.trim().replace(/\s+(?=[\~\d\(\)\+\-\s:])/g, '').replace(/([\~\+])\s+/g, '$1');
	return new SearchMatcher(toParentIterator, selector.split(/\s+/).map(function(part) {
				return part.split(/>/).map(function(block) {
					return new SearchMatcher(toPrevIterator, block.split(/\~(?!=)/).map(function (sPart) {
						return sPart.split(/\+(?!\d)/).map(function (sBlock) {
							return compileCssSelectorBasicBlock(sBlock);
						}).reverse();
					}).reverse());
				}).reverse();
			}).reverse());
}

function Css(rules, loader)  {
	this._rules = [];
	this._rulesByClass = {};
	this._rulesByTag = {};
	this._rulesById = {};
	this._wildCards = [];
	this._rulesCounter = 0;
	if(typeof rules == 'string') {
		this.appendContent(rules, loader);
	} else {
		this.appendParsedContent(rules || []);
	}
}

Css.prototype.bindRuleById = function(rule, id) {
	var list = this._rulesById[id];
	if (!list) {
		this._rulesById[id] = list = [];
	}
	list.push(rule);
};

Css.prototype.bindRuleByTag = function(rule, tag) {
	var list = this._rulesByTag[tag];
	if (!list) {
		this._rulesByTag[tag] = list = [];
	}
	list.push(rule);
};

Css.prototype.bindRuleByClass = function(rule, class_) {
	var list = this._rulesByClass[class_];
	if (!list) {
		this._rulesByClass[class_] = list = [];
	}
	list.push(rule);
};

function stylesToString(styles) {
	var result = [];
	for (var name in styles) {
		if (styles.hasOwnProperty(name)) {
			result.push(name + ':' + styles[name].value);
		}
	}
	return result.join(';');
};

Css.prototype.apply = function(cur) {
	var rules = this.rulesFor(cur);
	var beforeElement;
	var afterElement;
	rules.forEach(function(rule) {
		if (rule.beforeElement) {
			if (!beforeElement) {
				beforeElement = {
					tag: cur.tag,
					styles: {},
					virtual: true,
					children: []
				};
				cur.children.splice(0, 0, beforeElement);
			}
			rule.body.forEach(addProperty.bind(beforeElement));
		} else if (rule.afterElement) {
			if (!afterElement) {
				afterElement = {
					tag: cur.tag,
					styles: {},
					virtual: true,
					children: []
				};
				cur.children.push(afterElement);
			}
			rule.body.forEach(addProperty.bind(afterElement));
		} else {
			rule.body.forEach(addProperty.bind(cur));
		}
	});
	addInline(cur.attributes.style);
	if (cur.hasStyles) {
		cur.attributes.style = stylesToString(cur.styles);
	}
	if (beforeElement != null) {
		beforeElement.attributes = {style: stylesToString(beforeElement.styles)};
	}
	if (afterElement != null) {
		afterElement.attributes = {style: stylesToString(afterElement.styles)};
	}
	return;

	function addProperty (entry) {
		this.hasStyles = true;
		if (entry.property == 'content' && this.virtual && /^['"](.*)['"]$/.test(entry.value)) {
			this.children.push(RegExp.$1);
			return;
		}
		var styles = this.styles;
		var style = styles[entry.property];
		if (!style) {
			styles[entry.property] = {value: entry.value, important: entry.important};
		} else {
			if (!style.important || entry.important) {
				style.value = entry.value;
			}
		}
	}

	function addInline (inline) {
		var result = [];
		inline = (inline || '').trim();
		if (!inline) {
			return result;
		}
		inline.split(';').forEach(function(entry) {
			var splitted = entry.split(':');
			if (splitted.length != 2) {
				return;
			}
			addProperty.call(cur, styleEntry(splitted[0], splitted[1]));
		});
	}
};

function styleEntry(property, value) {
	var important = false;
	value = value.trim().replace(/!important$/, function() {
		important = true;
		return '';
	}).trim();
	return {
		property: property.trim(),
		value: value.trim(),
		important: important
	};
}

Css.prototype.rulesFor = function(cur) {
	var rules = [];
	var rulesAdded = {};
	addRules(this._wildCards);
	addRules(this._rulesByTag[cur.tag]);
	if (cur.tag) {
		addRules(this._rulesByTag[cur.tag]);
	}
	if (cur.classes) {
		cur.classes.forEach(function(clazz) {
			addRules(this._rulesByClass[clazz]);
		}.bind(this));
	}
	if (cur.id) {
		addRules(this._rulesById[cur.id]);
	}
	sortRules(rules);
	return rules;

	function addRules(rulesToAdd) {
		if (!rulesToAdd) {
			return;
		}
		for (var i = 0; i < rulesToAdd.length; i++) {
			var rule = rulesToAdd[i];
			if (!rulesAdded[rule.id] && rule.selector.match(cur)) {
				rules.push(rule);
				rulesAdded[rule.id] = true;
			}
		}
	}
};


Css.prototype.append = function(what, loader) {
	if (typeof what == 'string') {
		this.appendContent(what, loader);
	} else {
		this.appendParsedContent(what);
	}
};

Css.prototype.appendContent = function(what, loader) {
	this.appendParsedContent(parseRules(what, loader));
};

Css.prototype.appendParsedContent = function(rules) {
	rules.forEach(function(rule) {
		rule.id = this._rulesCounter++;
		if (!rule.selector.bind(this, rule)) {
			this._wildCards.push(rule);
		}
	}.bind(this));
	[{_:this._wildCards}, this._rulesByTag, this._rulesById, this._rulesByClass].forEach(function(dict) {
		Object.keys(dict).forEach(function(key) {
			sortRules(dict[key]);
		});
	});
};

function parseRules(content, loader) {
	var rules = [];
	cssParse(content).stylesheet.rules.forEach(function(rule) {
		if (rule.type == 'rule') {
			var selectors = rule.selectors.map(compileCssSelector);
			var body = rule.declarations;
			var i = 0;
			selectors.forEach(function(selector) {
				var selectorText = rule.selectors[i++];
				rules.push({
					selectorText: selectorText,
					selector: selector,
					specificity: specificityForSelector(selector),
					body: body.map(function(entry) {
						return styleEntry(entry.property, entry.value);
					}),
					beforeElement: /:before$/.test(selectorText),
					afterElement: /:after$/.test(selectorText)
				});
			});
		} else if (rule.type == 'import') {
			var url = parseUrl(rule.import.trim())
			if (url) {
				if (/^[^\/]+/.test(url)) {
					rules = rules.concat(parseRules(loader.load(url), loader));
				}
			}
		}
	});
	return rules;
}

function parseUrl(url) {
	if (/^(\'([^']*)\')|(\"([^"]*)\")|(url\(['"]?([^\)'"]*)['"]?\))$/.test(url.trim())) {
		return RegExp.$2 || RegExp.$4 || RegExp.$6;
	}
}

function sortRules(rules) {
	rules.sort(function(r1, r2) {
		return r1.specificity - r2.specificity;
	});
}

function specificityForSelector(selector) {
	var dest = [0, 0, 0];
	selector.addSpecificityTo(dest);
	return dest[0] * 1000000 + dest[1] * 1000 + dest[2];
}

exports.compileSelector = compileCssSelector;

exports.Css = Css;

exports.parseUrl = parseUrl;

exports.compile = function(content) {
	return new Css(parseRules(content));
};

exports.parseCssContent = parseRules;