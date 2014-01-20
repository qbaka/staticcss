var assert = require("assert")
var css = require('../lib/css');

describe('css selectors', function() {
	it('single', function() {
		assert.equal(true, css.compileSelector('div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('div#a').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('div').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('div').match({tag: 'div', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('div').match({tag: 'div'}));
		assert.equal(true, css.compileSelector('#a').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('.x').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('.x.y').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(false, css.compileSelector('div#a.x.y').match({tag: 'div', id: 'b', classes:['x','y','z']}));
		assert.equal(false, css.compileSelector('div#a.x.y').match({tag: 'button', id: 'a', classes:['x','y','z']}));
	});
	it('any', function() {
		assert.equal(true, css.compileSelector('*').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('*').match({tag: 'table', id: 'a', classes:['x','y','z']}));
		assert.equal(true, css.compileSelector('* *').match({tag: 'table', id: 'a', classes:['x','y','z'], parent: {tag:'table'}}));
		assert.equal(true, css.compileSelector('*.x').match({tag: 'table', id: 'a', classes:['x','y','z']}));

		assert.equal(false, css.compileSelector('*.w').match({tag: 'table', id: 'a', classes:['x','y','z']}));
		assert.equal(false, css.compileSelector('* *').match({tag: 'table', id: 'a', classes:['x','y','z']}));
	});
	it('nesting success', function() {
		assert.equal(true, css.compileSelector('div.z div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', id: 'a', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('table div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('table div  div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('table div.z div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
	});
	it('nesting fail', function() {
		assert.equal(false, css.compileSelector('div.q div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
	});
	it('direct nesting', function() {
		assert.equal(true, css.compileSelector('div>div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}));
		assert.equal(false, css.compileSelector('div.z>div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
	});
	it('mixed nesting success', function() {
		assert.equal(true, css.compileSelector('div div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('div.z>div div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('table>div.z div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
	});
	it('mixed nesting fail', function() {
		assert.equal(false, css.compileSelector('div>table div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
		assert.equal(false, css.compileSelector('table>div.a div>div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag: 'div', parent: {tag: 'div', classes: ['z','f', 'x', 'y'], parent:{tag:'table'}}}}));
	});
	it('sibling success', function() {
		assert.equal(true, css.compileSelector('div ~ div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag: 'div', prev: {tag: 'div', classes: ['z','f', 'x', 'y'], prev:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('div.z + div ~ div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag: 'div', prev: {tag: 'div', classes: ['z','f', 'x', 'y'], prev:{tag:'table'}}}}));
		assert.equal(true, css.compileSelector('table + div.z ~ div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag: 'div', prev: {tag: 'div', classes: ['z','f', 'x', 'y'], prev:{tag:'table'}}}}));
	});
	it('sibling fail', function() {
		assert.equal(false, css.compileSelector('div + table ~ div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag: 'div', prev: {tag: 'div', classes: ['z','f', 'x', 'y'], prev:{tag:'table'}}}}));
		assert.equal(false, css.compileSelector('table + div.a div + div#a.x.y').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag: 'div', prev: {tag: 'div', classes: ['z','f', 'x', 'y'], prev:{tag:'table'}}}}));
	});
	it('first-child', function() {
		assert.equal(true, css.compileSelector('div:first-child').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:first-child').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag:'div'}}));
	});
	it('last-child', function() {
		assert.equal(true, css.compileSelector('div:last-child').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:last-child').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
	});
	it('root', function() {
		assert.equal(true, css.compileSelector('div:root').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:root').match({tag: 'div', id: 'a', classes:['x','y','z'], parent: {tag:'div'}}));
	});
	it('not', function() {
		assert.equal(true, css.compileSelector('div:not(:first-child)').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:not(:first-child)').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:not(.x)').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
		assert.equal(true, css.compileSelector('div:not(:not(.x))').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
		assert.equal(true, css.compileSelector('div:not(.a)').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
	});
	it('nth-child', function() {
		assert.equal(true, css.compileSelector('div:nth-child(3)').match({tag: 'div', index:3}));
		assert.equal(false, css.compileSelector('div:nth-child(3)').match({tag: 'div', index:4}));

		assert.equal(true, css.compileSelector('div:nth-child(3n)').match({tag: 'div', index:3}));
		assert.equal(true, css.compileSelector('div:nth-child(3n)').match({tag: 'div', index:6}));
		assert.equal(false, css.compileSelector('div:nth-child(3n)').match({tag: 'div', index:7}));

		assert.equal(true, css.compileSelector('div:nth-child(n+3)').match({tag: 'div', index:3}));
		assert.equal(true, css.compileSelector('div:nth-child(n+3)').match({tag: 'div', index:4}));
		assert.equal(false, css.compileSelector('div:nth-child(n+3)').match({tag: 'div', index:2}));

		assert.equal(true, css.compileSelector('div:nth-child(-n+3)').match({tag: 'div', index:3}));
		assert.equal(true, css.compileSelector('div:nth-child(-n+3)').match({tag: 'div', index:2}));
		assert.equal(false, css.compileSelector('div:nth-child(-n+3)').match({tag: 'div', index:4}));

		assert.equal(true, css.compileSelector('div:nth-child(2n+3)').match({tag: 'div', index:3}));
		assert.equal(true, css.compileSelector('div:nth-child(2n+3)').match({tag: 'div', index:5}));
		assert.equal(false, css.compileSelector('div:nth-child(2n+3)').match({tag: 'div', index:6}));

		assert.equal(true, css.compileSelector('div:nth-child(-2n+3)').match({tag: 'div', index:3}));
		assert.equal(true, css.compileSelector('div:nth-child(-2n+3)').match({tag: 'div', index:1}));
		assert.equal(false, css.compileSelector('div:nth-child(-2n+3)').match({tag: 'div', index:5}));
	});
	it('attributes', function() {
		assert.equal(true, css.compileSelector('[a]').match({tag: 'div', attributes:{a:'b'}}));
		assert.equal(false, css.compileSelector('[a]').match({tag: 'div', attributes:{b:'b'}}));
		
		assert.equal(true, css.compileSelector('[a="b"]').match({tag: 'div', attributes:{a:'b'}}));
		assert.equal(true, css.compileSelector('[a=b]').match({tag: 'div', attributes:{a:'b'}}));
		assert.equal(false, css.compileSelector('[a="b"]').match({tag: 'div', attributes:{a:'bc'}}));
		
		assert.equal(true, css.compileSelector('[a~="bb"]').match({tag: 'div', attributes:{a:'bb'}}));
		assert.equal(true, css.compileSelector('[a~="bb"]').match({tag: 'div', attributes:{a:'aa bb'}}));
		assert.equal(false, css.compileSelector('[a~="bb"]').match({tag: 'div', attributes:{a:'bbb'}}));
		assert.equal(false, css.compileSelector('[a~="bb"]').match({tag: 'div', attributes:{}}));

		assert.equal(true, css.compileSelector('[a|="bb"]').match({tag: 'div', attributes:{a:'bb'}}));
		assert.equal(true, css.compileSelector('[a|="bb"]').match({tag: 'div', attributes:{a:'bb-aaaa'}}));
		assert.equal(false, css.compileSelector('[a|="bb"]').match({tag: 'div', attributes:{a:'bbb'}}));

		assert.equal(true, css.compileSelector('[a^="bb"]').match({tag: 'div', attributes:{a:'bb'}}));
		assert.equal(true, css.compileSelector('[a^="bb"]').match({tag: 'div', attributes:{a:'bba'}}));
		assert.equal(true, css.compileSelector('[a^="**"]').match({tag: 'div', attributes:{a:'**a'}}));
		assert.equal(false, css.compileSelector('[a^="bb"]').match({tag: 'div', attributes:{a:'aabb'}}));
		assert.equal(false, css.compileSelector('[a^="bb"]').match({tag: 'div', attributes:{}}));

		assert.equal(true, css.compileSelector('[a$="bb"]').match({tag: 'div', attributes:{a:'bb'}}));
		assert.equal(true, css.compileSelector('[a$="bb"]').match({tag: 'div', attributes:{a:'aabb'}}));
		assert.equal(false, css.compileSelector('[a$="bb"]').match({tag: 'div', attributes:{a:'bba'}}));
		assert.equal(false, css.compileSelector('[a$="bb"]').match({tag: 'div', attributes:{}}));

		assert.equal(true, css.compileSelector('[a*="bb"]').match({tag: 'div', attributes:{a:'abbc'}}));
		assert.equal(true, css.compileSelector('[a*="bb"]').match({tag: 'div', attributes:{a:'bba'}}));
		assert.equal(true, css.compileSelector('[a*="bb"]').match({tag: 'div', attributes:{a:'abb'}}));
		assert.equal(false, css.compileSelector('[a*="bb"]').match({tag: 'div', attributes:{a:'ab'}}));
		assert.equal(false, css.compileSelector('[a*="bb"]').match({tag: 'div', attributes:{}}));
	});
	it('only-child', function() {
		assert.equal(true, css.compileSelector('div:only-child').match({tag: 'div', id: 'a', classes:['x','y','z']}));
		assert.equal(false, css.compileSelector('div:only-child').match({tag: 'div', id: 'a', classes:['x','y','z'], prev: {tag:'div'}}));
		assert.equal(false, css.compileSelector('div:only-child').match({tag: 'div', id: 'a', classes:['x','y','z'], next: {tag:'div'}}));
	});
})