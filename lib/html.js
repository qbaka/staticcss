'use strict';

var Css = require('./css');
var htmlparser = require('htmlparser2');

function HtmlWriter() {
    this._result = [];
}

HtmlWriter.prototype.beginElement = function (tag, attribtues) {
    this.text('<').text(tag);
    Object.keys(attribtues).forEach(function (name) {
        this.text(' ').text(name).text('="').text(attribtues[name]).text('"');
    }.bind(this));
    return this.text('>');
};

HtmlWriter.prototype.endElement = function (tag) {
    return this.text('</').text(tag).text('>');
};

HtmlWriter.prototype.text = function (text) {
    this._result.push(text);
    return this;
};

HtmlWriter.prototype.result = function() {
    return this._result.join('');
};

function Element(tag, attributes) {
    var classes = attributes.class && attributes.class.trim();
    this.tag = tag;
    this.id = attributes.id;
    this.attributes = attributes;
    this.classes = classes ? classes.split(/\s+/) : [];
    this.next = null;
    this.prev = null;
    this.index = 0;
    this.indexOfType = 0;
    this.lastOfType = false;
    this.wasPlaceholders = false;
    this.parent = null;
    this.closed = false;
    this.root = false;
    this.children = [];
    this.childrenCount = 0;
    this.styles = {};
    this.virtual = false;
}

function Document(css) {
    this.css = css || new Css();
    this.body = new Element('body', {});
    this.body.root = true;
    this.images = [];
    this.cssInlined = false;
}

Document.prototype.load = function(content, loader) {
    var css = this.css;
    var images = this.images;
    var current = this.body;
    var inStyle = false;
    var ignoreContent = false;
    var inlineStyleBlock = '';
    var parser = new htmlparser.Parser({
        onopentag: function(tag, attributes) {
            tag = tag.toLowerCase();
            if (tag == 'style') {
                inStyle = true;
                ignoreContent = true;
                return;
            }
            if (tag == 'link') {
                if (attributes.rel && attributes.rel.toLowerCase() == 'stylesheet') {
                    css.append(loader.load(attributes.href, attributes.type), loader);
                }
                return;
            }
            if (tag == 'script') {
                ignoreContent == true;
                return;
            }
            var next = new Element(tag, attributes);
            if (current.closed) {
                next.index = current.index + 1;
                next.prev = current;
                next.parent = current.parent;
                current.next = next;
                next.nthOfTypeDict = current.nthOfTypeDict;
                next.lastOfTypeDict = current.lastOfTypeDict;
            } else {
                next.index  = 1;
                next.parent = current;
                next.nthOfTypeDict = {};
                next.lastOfTypeDict = {};
            }
            next.lastOfTypeDict[next.tag] = next;
            next.nthOfTypeDict[next.tag] = (next.indexOfType = next.nthOfTypeDict[next.tag] | 0) + 1;
            next.parent.children.push(next);
            next.parent.childrenCount++;
            current = next;
            if (tag == 'img') {
                images.push(current);
            }
        },
        ontext: function(text){
            if (inStyle) {
                inlineStyleBlock += text;
            }
            if (!ignoreContent) {
                var dest = current.closed ? current.parent : current;
                dest.children.push(text);
            }
        },
        onclosetag: function(tag){
            tag = tag.toLowerCase();
            if (tag == 'link') {
                return;
            }
            if (inStyle && tag == 'style') {
                css.appendContent(inlineStyleBlock, loader);
                inlineStyleBlock = '';
                inStyle = false;
            }
            if (ignoreContent) {
                ignoreContent = false;
                return;
            }

            if (current.closed) {
                var lastOfTypeDict = current.lastOfTypeDict;
                for (var tag in lastOfTypeDict) {
                    if (lastOfTypeDict.hasOwnProperty(tag)) {
                        lastOfTypeDict[tag].lastOfType = true;
                    }
                }
                current = current.parent;
            }
            current.closed = true;
        }
    });
    parser.write(content);
    parser.end();
};

Document.prototype.inlineCss = function(opts) {
    if (this.cssInlined) {
        return;
    }
    var preserveClass = !!opts.preserveClass;
    var imgLoader = opts.imgLoader;
    this.cssInlined = true;
    var css = this.css;
    this.body.children.forEach(visit);

    function visit(current) {
        if (typeof current != 'string') {
            if (!current.virtual) {
                css.apply(current);
                if (!preserveClass) {
                    delete current.attributes.class;
                }
                // if (imgLoader) {
                //     var url = Css.parseUrl(current.styles['background-image']);
                //     if (url && !/^data/.test(url)) {
                //         current.styles['background-image'] = 'url(data:;base64,' + imgLoader.load(url) + ')';
                //     }
                // }
            }
            current.children.forEach(visit);
        }
    }
};

Document.prototype.toString = function(opts) {
    this.inlineCss(opts);
    var writer = new HtmlWriter();
    this.body.children.forEach(visit);
    return writer.result().trim();

    function visit(current) {
        if (typeof current == 'string') {
            writer.text(current);
        } else {
            writer.beginElement(current.tag, current.attributes);
            current.children.forEach(visit);
            writer.endElement(current.tag);
        }
    }

};


exports.Document = Document;

