StaticCSS
=========

StaicCSS is node module that inlines all CSS styles into `style` attribute of element, which is very useful in emails. Provides full CSS3 support. 

For example:

**test.css**

    a {
        text-decoration: none;
    }
    div.a div.b:first-child {
        color: red;
    }

**test.html**

    <link rel="stylesheet" type="text/css" href="test.css">
    <a href="#somelink">Some link</a>
    <div class="a">
        <div>
            <div class="b">First</div>
            <div class="b">Last</div>
        </div>
    </div>

Result in: 

**output.html**

    <a href="#somelink" style="text-decoration:none">Some link</a>
    <div>
        <div>
            <div class="b" style="color:red">First</div>
            <div class="b">Last</div>
        </div>
    </div>

Features
--------

 - Full CSS3 support including
     - Attributes matching, like `[attr=value]`, `[attr~=value]`, etc
     - All pseudo elements like `:first-child`, `nth-element` and even `nth-of-type`. Dynamic pseudo elements (like `:visited`) blocks style since it is impossible to embed them into `style` attribute.
     - Pseudo classes: `::before`, `::after`
 - `<style>` blocks inside HTML
 - External CSS files references in `<link>` tag

Installation
------------
`npm install -g staticcsss`

Usage
---

    var staticcss = require('staticcss');
    
    /**
     * If youdon't use external CSS files and declare all styles in <style> block in      * HTML you can just pass html code to translate
     */
    var result = staticcss.apply({
        html: '<div>sample html</div>'
    });  

    /**
     * If you use external CSS files @root paramater specifies path for CSS files,
     * so if you write <link rel="stylesheet" type="text/css" href="dir/my.css">
     * path from <link> tag will be appended to path specified in @root param.
     */
    var result = staticcss.apply({
        html: '<div>sample html</div>',
        root: '/path/to/your/css/files'
    });  

    /**
     * If you want to execute code that uses the same CSS files periodically you can 
     * consider create cssLoader one time and then pass it to .apply function so that
     * you will not reparse CSS files again (especially if you use big CSS files like
     * Bootstrap)
     */
    var cssLoader = new staticcss.CachedCssLoader({root:'/path/to/your/css/files'});
    var result = staticcss.apply({
        html: '<div>sample html</div>',
        loader: cssLoader
    });

Command line usage
------------------

You can play with it from command line, or just precompute your mail tempaltes so that you won't need to process them at runtime and use with whatever programming language your want).

Command:

    staticss some.html
will output processed html file.

License
-------
StaticCSS is licensed under MIT license. Basically you can do whatever you want to with it.