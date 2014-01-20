'use strict';

var css = require('./css');
var html = require('./html');
var Path = require('path');
var fs = require('fs');

function id(x) {
	return x;
}

function FileLoader(root) {
	this.root = root;
}

FileLoader.prototype.load = function(path) {
	return fs.readFileSync(Path.join(this.root, path), 'utf-8');
};

FileLoader.prototype.lastChangedAt = function(path) {
	return fs.statSync(Path.join(this.root, path)).mtime;
};

function CachedLoader (opts) {
	this.reloadInterval = opts.reloadInterval || 5000;
	this._loader = opts.loader;
	this._cache = {};
	this._processor = opts.processor || id;
}

CachedLoader.prototype.load = function(path) {
	var cached = this._cache[path];
	var now = new Date().getTime();
	if (!cached) {
		cached = this._cache[path] = {content: this._loader.load(path), timestamp: now};
	} else if (now - cached.timestamp > this.reloadInterval) {
		cached.timestamp = now;
		if (this._loader.lastChangedAt(path).getTime() > cached.timestamp) {
			cached.content = this._loader.load(path);
		}
	}
	cached.processed = this._processor(cached.content);
	return cached.processed;
};

CachedLoader.prototype.lastChangedAt = function (path) {
	return this._loader.lastChangedAt(path);
};

 function CachedCssLoader (opts) {
	var fileLoader = new CachedLoader({
		reloadInterval: opts.reloadInterval,
		loader: opts.loader || new FileLoader(opts.root),
	});
	return new CachedLoader({
		reloadInterval: 1000000,
		loader: fileLoader,
		processor: function (content) {
			return css.parseCssContent(content, fileLoader);
		}
	});
}


exports.Css = css.Css;
exports.Document = html.Document;

exports.CachedLoader = CachedLoader;
exports.FileLoader = FileLoader;

exports.CachedCssLoader = CachedCssLoader;

exports.apply = function(opts) {
    var document = new html.Document(new css.Css(opts.css || '', opts.loader || new CachedCssLoader(opts)));
    document.load(opts.html, opts.loader);
    return document.toString(opts);
};

