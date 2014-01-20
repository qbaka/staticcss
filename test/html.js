var assert = require("assert")
var cssapply = require('../lib');
var fs = require('fs');
var path = require('path');

var cssLoader = new cssapply.CachedCssLoader({root:__dirname, reloadInterval: -1});

function readFile(name) {
	return fs.readFileSync(path.join(__dirname, name), 'utf-8');
}

function testFile(name) {
	assert.equal(
    		cssapply.apply({
	    		html: readFile(name + '.html'),
                loader: cssLoader,
                preserveClass: true
	    	}),
    		readFile(name + '.res.html').trim()
    	);
}

describe('Cssapply', function(){
    it('should parse bootstrap', function(){
    	var bootstrap = new cssapply.Css(readFile('bootstrap.css'), cssLoader);
    });
    it('should apply simple css to html', function(){
    	assert.equal(
    		cssapply.apply({
	    		html: '<div class="t1" style="color:black;">t1 t2</div><span class="t2" style="width: 20px !important">t1 t2</span><span class="t2" style="width:20px;">t1 t2</span>',
	    		css: '.t1 { background: white; } div + span { color: yellow; } span.t2 {width:10px !important;}',
                preserveClass: true
    		}),
    		'<div class="t1" style="background:white;color:black">t1 t2</div><span class="t2" style="color:yellow;width:20px">t1 t2</span><span class="t2" style="width:10px">t1 t2</span>'
    	);
    })
    it('should apply inline <style> block', function(){
    	testFile('inline-style');
    });
    it('nth-child', function(){
    	testFile('nth-child');
    });
    it('nth-last-child', function(){
    	testFile('nth-last-child');
    });
    it('escapes', function(){
        testFile('escaping');
    });
    it('loads external css', function(){
        testFile("test-extern-css");
    });
    it('loads before & after pseudo elements', function(){
        testFile("before-after");
    });
    it('important works', function(){
        testFile("important");
    });
    it('css caching works', function(){
        testFile("test-extern-css");
        testFile("test-extern-css");
    });
})