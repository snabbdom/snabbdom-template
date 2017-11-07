(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var ScopeChecker_1 = require('./ScopeChecker');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
function toElArray(input) {
    return Array.prototype.slice.call(input);
}
var ElementFinder = (function () {
    function ElementFinder(namespace, isolateModule) {
        this.namespace = namespace;
        this.isolateModule = isolateModule;
    }
    ElementFinder.prototype.call = function (rootElement) {
        var namespace = this.namespace;
        if (namespace.join("") === "") {
            return rootElement;
        }
        var scope = utils_1.getScope(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(scope, this.isolateModule);
        var selector = utils_1.getSelectors(namespace);
        var topNode = rootElement;
        var topNodeMatches = [];
        if (scope.length > 0) {
            topNode = this.isolateModule.getIsolatedElement(scope) || rootElement;
            if (selector && matchesSelector(topNode, selector)) {
                topNodeMatches.push(topNode);
            }
        }
        return toElArray(topNode.querySelectorAll(selector))
            .filter(scopeChecker.isStrictlyInRootScope, scopeChecker)
            .concat(topNodeMatches);
    };
    return ElementFinder;
}());
exports.ElementFinder = ElementFinder;

},{"./ScopeChecker":5,"./utils":18,"matches-selector":20}],2:[function(require,module,exports){
"use strict";
var ScopeChecker_1 = require('./ScopeChecker');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
/**
 * Attaches an actual event listener to the DOM root element,
 * handles "destinations" (interested DOMSource output subjects), and bubbling.
 */
var EventDelegator = (function () {
    function EventDelegator(topElement, eventType, useCapture, isolateModule) {
        var _this = this;
        this.topElement = topElement;
        this.eventType = eventType;
        this.useCapture = useCapture;
        this.isolateModule = isolateModule;
        this.destinations = [];
        this.roof = topElement.parentElement;
        if (useCapture) {
            this.domListener = function (ev) { return _this.capture(ev); };
        }
        else {
            this.domListener = function (ev) { return _this.bubble(ev); };
        }
        topElement.addEventListener(eventType, this.domListener, useCapture);
    }
    EventDelegator.prototype.bubble = function (rawEvent) {
        if (!document.body.contains(rawEvent.currentTarget)) {
            return;
        }
        var ev = this.patchEvent(rawEvent);
        for (var el = ev.target; el && el !== this.roof; el = el.parentElement) {
            if (ev.propagationHasBeenStopped) {
                return;
            }
            this.matchEventAgainstDestinations(el, ev);
        }
    };
    EventDelegator.prototype.matchEventAgainstDestinations = function (el, ev) {
        for (var i = 0, n = this.destinations.length; i < n; i++) {
            var dest = this.destinations[i];
            if (!dest.scopeChecker.isStrictlyInRootScope(el)) {
                continue;
            }
            if (matchesSelector(el, dest.selector)) {
                this.mutateEventCurrentTarget(ev, el);
                dest.subject._n(ev);
            }
        }
    };
    EventDelegator.prototype.capture = function (ev) {
        for (var i = 0, n = this.destinations.length; i < n; i++) {
            var dest = this.destinations[i];
            if (matchesSelector(ev.target, dest.selector)) {
                dest.subject._n(ev);
            }
        }
    };
    EventDelegator.prototype.addDestination = function (subject, namespace) {
        var scope = utils_1.getScope(namespace);
        var selector = utils_1.getSelectors(namespace);
        var scopeChecker = new ScopeChecker_1.ScopeChecker(scope, this.isolateModule);
        this.destinations.push({ subject: subject, scopeChecker: scopeChecker, selector: selector });
    };
    EventDelegator.prototype.patchEvent = function (event) {
        var pEvent = event;
        pEvent.propagationHasBeenStopped = false;
        var oldStopPropagation = pEvent.stopPropagation;
        pEvent.stopPropagation = function stopPropagation() {
            oldStopPropagation.call(this);
            this.propagationHasBeenStopped = true;
        };
        return pEvent;
    };
    EventDelegator.prototype.mutateEventCurrentTarget = function (event, currentTargetElement) {
        try {
            Object.defineProperty(event, "currentTarget", {
                value: currentTargetElement,
                configurable: true,
            });
        }
        catch (err) {
            console.log("please use event.ownerTarget");
        }
        event.ownerTarget = currentTargetElement;
    };
    EventDelegator.prototype.updateTopElement = function (newTopElement) {
        this.topElement.removeEventListener(this.eventType, this.domListener, this.useCapture);
        newTopElement.addEventListener(this.eventType, this.domListener, this.useCapture);
        this.topElement = newTopElement;
    };
    return EventDelegator;
}());
exports.EventDelegator = EventDelegator;

},{"./ScopeChecker":5,"./utils":18,"matches-selector":20}],3:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var HTMLSource = (function () {
    function HTMLSource(html$, runSA) {
        this.runSA = runSA;
        this._html$ = html$;
        this._empty$ = runSA.adapt(xstream_1.default.empty(), xstream_adapter_1.default.streamSubscribe);
    }
    HTMLSource.prototype.elements = function () {
        return this.runSA.adapt(this._html$, xstream_adapter_1.default.streamSubscribe);
    };
    HTMLSource.prototype.select = function (selector) {
        return new HTMLSource(xstream_1.default.empty(), this.runSA);
    };
    HTMLSource.prototype.events = function (eventType, options) {
        return this._empty$;
    };
    return HTMLSource;
}());
exports.HTMLSource = HTMLSource;

},{"@cycle/xstream-adapter":19,"xstream":98}],4:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var xstream_1 = require('xstream');
var ElementFinder_1 = require('./ElementFinder');
var fromEvent_1 = require('./fromEvent');
var isolate_1 = require('./isolate');
var EventDelegator_1 = require('./EventDelegator');
var utils_1 = require('./utils');
var matchesSelector;
try {
    matchesSelector = require("matches-selector");
}
catch (e) {
    matchesSelector = Function.prototype;
}
var eventTypesThatDontBubble = [
    "load",
    "unload",
    "focus",
    "blur",
    "mouseenter",
    "mouseleave",
    "submit",
    "change",
    "reset",
    "timeupdate",
    "playing",
    "waiting",
    "seeking",
    "seeked",
    "ended",
    "loadedmetadata",
    "loadeddata",
    "canplay",
    "canplaythrough",
    "durationchange",
    "play",
    "pause",
    "ratechange",
    "volumechange",
    "suspend",
    "emptied",
    "stalled",
];
function determineUseCapture(eventType, options) {
    var result = false;
    if (typeof options.useCapture === "boolean") {
        result = options.useCapture;
    }
    if (eventTypesThatDontBubble.indexOf(eventType) !== -1) {
        result = true;
    }
    return result;
}
var MainDOMSource = (function () {
    function MainDOMSource(_rootElement$, _runStreamAdapter, _namespace, _isolateModule, _delegators) {
        if (_namespace === void 0) { _namespace = []; }
        this._rootElement$ = _rootElement$;
        this._runStreamAdapter = _runStreamAdapter;
        this._namespace = _namespace;
        this._isolateModule = _isolateModule;
        this._delegators = _delegators;
        this.isolateSource = isolate_1.isolateSource;
        this.isolateSink = isolate_1.isolateSink;
    }
    MainDOMSource.prototype.elements = function () {
        var output$;
        if (this._namespace.length === 0) {
            output$ = this._rootElement$;
        }
        else {
            var elementFinder_1 = new ElementFinder_1.ElementFinder(this._namespace, this._isolateModule);
            output$ = this._rootElement$.map(function (el) { return elementFinder_1.call(el); });
        }
        var runSA = this._runStreamAdapter;
        return runSA.remember(runSA.adapt(output$, xstream_adapter_1.default.streamSubscribe));
    };
    Object.defineProperty(MainDOMSource.prototype, "namespace", {
        get: function () {
            return this._namespace;
        },
        enumerable: true,
        configurable: true
    });
    MainDOMSource.prototype.select = function (selector) {
        if (typeof selector !== 'string') {
            throw new Error("DOM driver's select() expects the argument to be a " +
                "string as a CSS selector");
        }
        var trimmedSelector = selector.trim();
        var childNamespace = trimmedSelector === ":root" ?
            this._namespace :
            this._namespace.concat(trimmedSelector);
        return new MainDOMSource(this._rootElement$, this._runStreamAdapter, childNamespace, this._isolateModule, this._delegators);
    };
    MainDOMSource.prototype.events = function (eventType, options) {
        if (options === void 0) { options = {}; }
        if (typeof eventType !== "string") {
            throw new Error("DOM driver's events() expects argument to be a " +
                "string representing the event type to listen for.");
        }
        var useCapture = determineUseCapture(eventType, options);
        var namespace = this._namespace;
        var scope = utils_1.getScope(namespace);
        var keyParts = [eventType, useCapture];
        if (scope) {
            keyParts.push(scope);
        }
        var key = keyParts.join('~');
        var domSource = this;
        var rootElement$;
        if (scope) {
            var hadIsolated_mutable_1 = false;
            rootElement$ = this._rootElement$
                .filter(function (rootElement) {
                var hasIsolated = !!domSource._isolateModule.getIsolatedElement(scope);
                var shouldPass = hasIsolated && !hadIsolated_mutable_1;
                hadIsolated_mutable_1 = hasIsolated;
                return shouldPass;
            });
        }
        else {
            rootElement$ = this._rootElement$.take(2);
        }
        var event$ = rootElement$
            .map(function setupEventDelegatorOnTopElement(rootElement) {
            // Event listener just for the root element
            if (!namespace || namespace.length === 0) {
                return fromEvent_1.fromEvent(rootElement, eventType, useCapture);
            }
            // Event listener on the top element as an EventDelegator
            var delegators = domSource._delegators;
            var top = scope
                ? domSource._isolateModule.getIsolatedElement(scope)
                : rootElement;
            var delegator;
            if (delegators.has(key)) {
                delegator = delegators.get(key);
                delegator.updateTopElement(top);
            }
            else {
                delegator = new EventDelegator_1.EventDelegator(top, eventType, useCapture, domSource._isolateModule);
                delegators.set(key, delegator);
            }
            var subject = xstream_1.default.create();
            if (scope) {
                domSource._isolateModule.addEventDelegator(scope, delegator);
            }
            delegator.addDestination(subject, namespace);
            return subject;
        })
            .flatten();
        return this._runStreamAdapter.adapt(event$, xstream_adapter_1.default.streamSubscribe);
    };
    MainDOMSource.prototype.dispose = function () {
        this._isolateModule.reset();
    };
    return MainDOMSource;
}());
exports.MainDOMSource = MainDOMSource;

},{"./ElementFinder":1,"./EventDelegator":2,"./fromEvent":7,"./isolate":11,"./utils":18,"@cycle/xstream-adapter":19,"matches-selector":20,"xstream":98}],5:[function(require,module,exports){
"use strict";
var ScopeChecker = (function () {
    function ScopeChecker(scope, isolateModule) {
        this.scope = scope;
        this.isolateModule = isolateModule;
    }
    ScopeChecker.prototype.isStrictlyInRootScope = function (leaf) {
        for (var el = leaf; el; el = el.parentElement) {
            var scope = this.isolateModule.isIsolatedElement(el);
            if (scope && scope !== this.scope) {
                return false;
            }
            if (scope) {
                return true;
            }
        }
        return true;
    };
    return ScopeChecker;
}());
exports.ScopeChecker = ScopeChecker;

},{}],6:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
var classNameFromVNode_1 = require('snabbdom-selector/lib/classNameFromVNode');
var selectorParser_1 = require('snabbdom-selector/lib/selectorParser');
var VNodeWrapper = (function () {
    function VNodeWrapper(rootElement) {
        this.rootElement = rootElement;
    }
    VNodeWrapper.prototype.call = function (vnode) {
        var _a = selectorParser_1.default(vnode.sel), selectorTagName = _a.tagName, selectorId = _a.id;
        var vNodeClassName = classNameFromVNode_1.default(vnode);
        var vNodeData = vnode.data || {};
        var vNodeDataProps = vNodeData.props || {};
        var _b = vNodeDataProps.id, vNodeId = _b === void 0 ? selectorId : _b;
        var isVNodeAndRootElementIdentical = vNodeId.toUpperCase() === this.rootElement.id.toUpperCase() &&
            selectorTagName.toUpperCase() === this.rootElement.tagName.toUpperCase() &&
            vNodeClassName.toUpperCase() === this.rootElement.className.toUpperCase();
        if (isVNodeAndRootElementIdentical) {
            return vnode;
        }
        var _c = this.rootElement, tagName = _c.tagName, id = _c.id, className = _c.className;
        var elementId = id ? "#" + id : "";
        var elementClassName = className ?
            "." + className.split(" ").join(".") : "";
        return hyperscript_1.h("" + tagName + elementId + elementClassName, {}, [vnode]);
    };
    return VNodeWrapper;
}());
exports.VNodeWrapper = VNodeWrapper;

},{"./hyperscript":9,"snabbdom-selector/lib/classNameFromVNode":21,"snabbdom-selector/lib/selectorParser":22}],7:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
function fromEvent(element, eventName, useCapture) {
    if (useCapture === void 0) { useCapture = false; }
    return xstream_1.Stream.create({
        element: element,
        next: null,
        start: function start(listener) {
            this.next = function next(event) { listener.next(event); };
            this.element.addEventListener(eventName, this.next, useCapture);
        },
        stop: function stop() {
            this.element.removeEventListener(eventName, this.next, useCapture);
        }
    });
}
exports.fromEvent = fromEvent;

},{"xstream":98}],8:[function(require,module,exports){
"use strict";
var hyperscript_1 = require('./hyperscript');
function isValidString(param) {
    return typeof param === 'string' && param.length > 0;
}
function isSelector(param) {
    return isValidString(param) && (param[0] === '.' || param[0] === '#');
}
function createTagFunction(tagName) {
    return function hyperscript(first, b, c) {
        if (isSelector(first)) {
            if (!!b && !!c) {
                return hyperscript_1.h(tagName + first, b, c);
            }
            else if (!!b) {
                return hyperscript_1.h(tagName + first, b);
            }
            else {
                return hyperscript_1.h(tagName + first, {});
            }
        }
        else if (!!b) {
            return hyperscript_1.h(tagName, first, b);
        }
        else if (!!first) {
            return hyperscript_1.h(tagName, first);
        }
        else {
            return hyperscript_1.h(tagName, {});
        }
    };
}
var SVG_TAG_NAMES = [
    'a', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
    'animateMotion', 'animateTransform', 'circle', 'clipPath', 'colorProfile',
    'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
    'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
    'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
    'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
    'feSpotlight', 'feTile', 'feTurbulence', 'filter', 'font', 'fontFace',
    'fontFaceFormat', 'fontFaceName', 'fontFaceSrc', 'fontFaceUri',
    'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
    'linearGradient', 'marker', 'mask', 'metadata', 'missingGlyph', 'mpath',
    'path', 'pattern', 'polygon', 'polyling', 'radialGradient', 'rect', 'script',
    'set', 'stop', 'style', 'switch', 'symbol', 'text', 'textPath', 'title',
    'tref', 'tspan', 'use', 'view', 'vkern'
];
var svg = createTagFunction('svg');
SVG_TAG_NAMES.forEach(function (tag) {
    svg[tag] = createTagFunction(tag);
});
var TAG_NAMES = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
    'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
    'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'dir', 'div', 'dl',
    'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
    'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend',
    'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'nav', 'noscript',
    'object', 'ol', 'optgroup', 'option', 'p', 'param', 'pre', 'progress', 'q',
    'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small',
    'source', 'span', 'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td',
    'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul', 'video'
];
var exported = { SVG_TAG_NAMES: SVG_TAG_NAMES, TAG_NAMES: TAG_NAMES, svg: svg, isSelector: isSelector, createTagFunction: createTagFunction };
TAG_NAMES.forEach(function (n) {
    exported[n] = createTagFunction(n);
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exported;

},{"./hyperscript":9}],9:[function(require,module,exports){
"use strict";
var is = require('snabbdom/is');
var vnode = require('snabbdom/vnode');
function isGenericStream(x) {
    return !Array.isArray(x) && typeof x.map === "function";
}
function mutateStreamWithNS(vNode) {
    addNS(vNode.data, vNode.children);
    return vNode;
}
function addNS(data, children) {
    data.ns = "http://www.w3.org/2000/svg";
    if (typeof children !== "undefined" && is.array(children)) {
        for (var i = 0; i < children.length; ++i) {
            if (isGenericStream(children[i])) {
                children[i] = children[i].map(mutateStreamWithNS);
            }
            else {
                addNS(children[i].data, children[i].children);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {};
    var children;
    var text;
    var i;
    if (arguments.length === 3) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
    }
    else if (arguments.length === 2) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else {
            data = b;
        }
    }
    if (is.array(children)) {
        children = children.filter(function (x) { return x; });
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i])) {
                children[i] = vnode(undefined, undefined, undefined, children[i]);
            }
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
        addNS(data, children);
    }
    return vnode(sel, data, children, text, undefined);
}
exports.h = h;
;

},{"snabbdom/is":58,"snabbdom/vnode":67}],10:[function(require,module,exports){
"use strict";
var thunk = require('snabbdom/thunk');
exports.thunk = thunk;
var makeDOMDriver_1 = require('./makeDOMDriver');
exports.makeDOMDriver = makeDOMDriver_1.makeDOMDriver;
var makeHTMLDriver_1 = require('./makeHTMLDriver');
exports.makeHTMLDriver = makeHTMLDriver_1.makeHTMLDriver;
var mockDOMSource_1 = require('./mockDOMSource');
exports.mockDOMSource = mockDOMSource_1.mockDOMSource;
var hyperscript_1 = require('./hyperscript');
exports.h = hyperscript_1.h;
var hyperscript_helpers_1 = require('./hyperscript-helpers');
exports.svg = hyperscript_helpers_1.default.svg;
exports.a = hyperscript_helpers_1.default.a;
exports.abbr = hyperscript_helpers_1.default.abbr;
exports.address = hyperscript_helpers_1.default.address;
exports.area = hyperscript_helpers_1.default.area;
exports.article = hyperscript_helpers_1.default.article;
exports.aside = hyperscript_helpers_1.default.aside;
exports.audio = hyperscript_helpers_1.default.audio;
exports.b = hyperscript_helpers_1.default.b;
exports.base = hyperscript_helpers_1.default.base;
exports.bdi = hyperscript_helpers_1.default.bdi;
exports.bdo = hyperscript_helpers_1.default.bdo;
exports.blockquote = hyperscript_helpers_1.default.blockquote;
exports.body = hyperscript_helpers_1.default.body;
exports.br = hyperscript_helpers_1.default.br;
exports.button = hyperscript_helpers_1.default.button;
exports.canvas = hyperscript_helpers_1.default.canvas;
exports.caption = hyperscript_helpers_1.default.caption;
exports.cite = hyperscript_helpers_1.default.cite;
exports.code = hyperscript_helpers_1.default.code;
exports.col = hyperscript_helpers_1.default.col;
exports.colgroup = hyperscript_helpers_1.default.colgroup;
exports.dd = hyperscript_helpers_1.default.dd;
exports.del = hyperscript_helpers_1.default.del;
exports.dfn = hyperscript_helpers_1.default.dfn;
exports.dir = hyperscript_helpers_1.default.dir;
exports.div = hyperscript_helpers_1.default.div;
exports.dl = hyperscript_helpers_1.default.dl;
exports.dt = hyperscript_helpers_1.default.dt;
exports.em = hyperscript_helpers_1.default.em;
exports.embed = hyperscript_helpers_1.default.embed;
exports.fieldset = hyperscript_helpers_1.default.fieldset;
exports.figcaption = hyperscript_helpers_1.default.figcaption;
exports.figure = hyperscript_helpers_1.default.figure;
exports.footer = hyperscript_helpers_1.default.footer;
exports.form = hyperscript_helpers_1.default.form;
exports.h1 = hyperscript_helpers_1.default.h1;
exports.h2 = hyperscript_helpers_1.default.h2;
exports.h3 = hyperscript_helpers_1.default.h3;
exports.h4 = hyperscript_helpers_1.default.h4;
exports.h5 = hyperscript_helpers_1.default.h5;
exports.h6 = hyperscript_helpers_1.default.h6;
exports.head = hyperscript_helpers_1.default.head;
exports.header = hyperscript_helpers_1.default.header;
exports.hgroup = hyperscript_helpers_1.default.hgroup;
exports.hr = hyperscript_helpers_1.default.hr;
exports.html = hyperscript_helpers_1.default.html;
exports.i = hyperscript_helpers_1.default.i;
exports.iframe = hyperscript_helpers_1.default.iframe;
exports.img = hyperscript_helpers_1.default.img;
exports.input = hyperscript_helpers_1.default.input;
exports.ins = hyperscript_helpers_1.default.ins;
exports.kbd = hyperscript_helpers_1.default.kbd;
exports.keygen = hyperscript_helpers_1.default.keygen;
exports.label = hyperscript_helpers_1.default.label;
exports.legend = hyperscript_helpers_1.default.legend;
exports.li = hyperscript_helpers_1.default.li;
exports.link = hyperscript_helpers_1.default.link;
exports.main = hyperscript_helpers_1.default.main;
exports.map = hyperscript_helpers_1.default.map;
exports.mark = hyperscript_helpers_1.default.mark;
exports.menu = hyperscript_helpers_1.default.menu;
exports.meta = hyperscript_helpers_1.default.meta;
exports.nav = hyperscript_helpers_1.default.nav;
exports.noscript = hyperscript_helpers_1.default.noscript;
exports.object = hyperscript_helpers_1.default.object;
exports.ol = hyperscript_helpers_1.default.ol;
exports.optgroup = hyperscript_helpers_1.default.optgroup;
exports.option = hyperscript_helpers_1.default.option;
exports.p = hyperscript_helpers_1.default.p;
exports.param = hyperscript_helpers_1.default.param;
exports.pre = hyperscript_helpers_1.default.pre;
exports.progress = hyperscript_helpers_1.default.progress;
exports.q = hyperscript_helpers_1.default.q;
exports.rp = hyperscript_helpers_1.default.rp;
exports.rt = hyperscript_helpers_1.default.rt;
exports.ruby = hyperscript_helpers_1.default.ruby;
exports.s = hyperscript_helpers_1.default.s;
exports.samp = hyperscript_helpers_1.default.samp;
exports.script = hyperscript_helpers_1.default.script;
exports.section = hyperscript_helpers_1.default.section;
exports.select = hyperscript_helpers_1.default.select;
exports.small = hyperscript_helpers_1.default.small;
exports.source = hyperscript_helpers_1.default.source;
exports.span = hyperscript_helpers_1.default.span;
exports.strong = hyperscript_helpers_1.default.strong;
exports.style = hyperscript_helpers_1.default.style;
exports.sub = hyperscript_helpers_1.default.sub;
exports.sup = hyperscript_helpers_1.default.sup;
exports.table = hyperscript_helpers_1.default.table;
exports.tbody = hyperscript_helpers_1.default.tbody;
exports.td = hyperscript_helpers_1.default.td;
exports.textarea = hyperscript_helpers_1.default.textarea;
exports.tfoot = hyperscript_helpers_1.default.tfoot;
exports.th = hyperscript_helpers_1.default.th;
exports.thead = hyperscript_helpers_1.default.thead;
exports.title = hyperscript_helpers_1.default.title;
exports.tr = hyperscript_helpers_1.default.tr;
exports.u = hyperscript_helpers_1.default.u;
exports.ul = hyperscript_helpers_1.default.ul;
exports.video = hyperscript_helpers_1.default.video;

},{"./hyperscript":9,"./hyperscript-helpers":8,"./makeDOMDriver":13,"./makeHTMLDriver":14,"./mockDOMSource":15,"snabbdom/thunk":66}],11:[function(require,module,exports){
"use strict";
var utils_1 = require('./utils');
function isolateSource(source, scope) {
    return source.select(utils_1.SCOPE_PREFIX + scope);
}
exports.isolateSource = isolateSource;
function isolateSink(sink, scope) {
    return sink.map(function (vTree) {
        if (vTree.data.isolate) {
            var existingScope = parseInt(vTree.data.isolate.split(utils_1.SCOPE_PREFIX + 'cycle')[1]);
            var _scope = parseInt(scope.split('cycle')[1]);
            if (Number.isNaN(existingScope) ||
                Number.isNaN(_scope) ||
                existingScope > _scope) {
                return vTree;
            }
        }
        vTree.data.isolate = utils_1.SCOPE_PREFIX + scope;
        return vTree;
    });
}
exports.isolateSink = isolateSink;

},{"./utils":18}],12:[function(require,module,exports){
"use strict";
var IsolateModule = (function () {
    function IsolateModule(isolatedElements) {
        this.isolatedElements = isolatedElements;
        this.eventDelegators = new Map();
    }
    IsolateModule.prototype.setScope = function (elm, scope) {
        this.isolatedElements.set(scope, elm);
    };
    IsolateModule.prototype.removeScope = function (scope) {
        this.isolatedElements.delete(scope);
    };
    IsolateModule.prototype.getIsolatedElement = function (scope) {
        return this.isolatedElements.get(scope);
    };
    IsolateModule.prototype.isIsolatedElement = function (elm) {
        var elements = Array.from(this.isolatedElements.entries());
        for (var i = 0; i < elements.length; ++i) {
            if (elm === elements[i][1]) {
                return elements[i][0];
            }
        }
        return false;
    };
    IsolateModule.prototype.addEventDelegator = function (scope, eventDelegator) {
        var delegators = this.eventDelegators.get(scope);
        if (!delegators) {
            delegators = [];
            this.eventDelegators.set(scope, delegators);
        }
        delegators[delegators.length] = eventDelegator;
    };
    IsolateModule.prototype.reset = function () {
        this.isolatedElements.clear();
    };
    IsolateModule.prototype.createModule = function () {
        var self = this;
        return {
            create: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldScope = oldData.isolate || "";
                var scope = data.isolate || "";
                if (scope) {
                    if (oldScope) {
                        self.removeScope(oldScope);
                    }
                    self.setScope(elm, scope);
                    var delegators = self.eventDelegators.get(scope);
                    if (delegators) {
                        for (var i = 0, len = delegators.length; i < len; ++i) {
                            delegators[i].updateTopElement(elm);
                        }
                    }
                    else if (delegators === void 0) {
                        self.eventDelegators.set(scope, []);
                    }
                }
                if (oldScope && !scope) {
                    self.removeScope(scope);
                }
            },
            update: function (oldVNode, vNode) {
                var _a = oldVNode.data, oldData = _a === void 0 ? {} : _a;
                var elm = vNode.elm, _b = vNode.data, data = _b === void 0 ? {} : _b;
                var oldScope = oldData.isolate || "";
                var scope = data.isolate || "";
                if (scope) {
                    if (oldScope) {
                        self.removeScope(oldScope);
                    }
                    self.setScope(elm, scope);
                }
                if (oldScope && !scope) {
                    self.removeScope(scope);
                }
            },
            remove: function (_a, cb) {
                var data = _a.data;
                data = data || {};
                var scope = data.isolate;
                if (scope) {
                    self.removeScope(scope);
                    if (self.eventDelegators.get(scope)) {
                        self.eventDelegators.set(scope, []);
                    }
                }
                cb();
            },
            destroy: function (_a) {
                var data = _a.data;
                data = data || {};
                var scope = data.isolate;
                if (scope) {
                    self.removeScope(scope);
                    if (self.eventDelegators.get(scope)) {
                        self.eventDelegators.set(scope, []);
                    }
                }
            }
        };
    };
    return IsolateModule;
}());
exports.IsolateModule = IsolateModule;

},{}],13:[function(require,module,exports){
"use strict";
var snabbdom_1 = require('snabbdom');
var xstream_1 = require('xstream');
var MainDOMSource_1 = require('./MainDOMSource');
var VNodeWrapper_1 = require('./VNodeWrapper');
var utils_1 = require('./utils');
var modules_1 = require('./modules');
var isolateModule_1 = require('./isolateModule');
var transposition_1 = require('./transposition');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
function makeDOMDriverInputGuard(modules) {
    if (!Array.isArray(modules)) {
        throw new Error("Optional modules option must be " +
            "an array for snabbdom modules");
    }
}
function domDriverInputGuard(view$) {
    if (!view$
        || typeof view$.addListener !== "function"
        || typeof view$.fold !== "function") {
        throw new Error("The DOM driver function expects as input a Stream of " +
            "virtual DOM elements");
    }
}
function makeDOMDriver(container, options) {
    if (!options) {
        options = {};
    }
    var transposition = options.transposition || false;
    var modules = options.modules || modules_1.default;
    var isolateModule = new isolateModule_1.IsolateModule((new Map()));
    var patch = snabbdom_1.init([isolateModule.createModule()].concat(modules));
    var rootElement = utils_1.getElement(container);
    var vnodeWrapper = new VNodeWrapper_1.VNodeWrapper(rootElement);
    var delegators = new Map();
    makeDOMDriverInputGuard(modules);
    function DOMDriver(vnode$, runStreamAdapter) {
        domDriverInputGuard(vnode$);
        var transposeVNode = transposition_1.makeTransposeVNode(runStreamAdapter);
        var preprocessedVNode$ = (transposition ? vnode$.map(transposeVNode).flatten() : vnode$);
        var rootElement$ = preprocessedVNode$
            .map(function (vnode) { return vnodeWrapper.call(vnode); })
            .fold(patch, rootElement)
            .drop(1)
            .map(function unwrapElementFromVNode(vnode) { return vnode.elm; })
            .compose(function (stream) { return xstream_1.default.merge(stream, xstream_1.default.never()); }) // don't complete this stream
            .startWith(rootElement);
        /* tslint:disable:no-empty */
        rootElement$.addListener({ next: function () { }, error: function () { }, complete: function () { } });
        /* tslint:enable:no-empty */
        return new MainDOMSource_1.MainDOMSource(rootElement$, runStreamAdapter, [], isolateModule, delegators);
    }
    ;
    DOMDriver.streamAdapter = xstream_adapter_1.default;
    return DOMDriver;
}
exports.makeDOMDriver = makeDOMDriver;

},{"./MainDOMSource":4,"./VNodeWrapper":6,"./isolateModule":12,"./modules":16,"./transposition":17,"./utils":18,"@cycle/xstream-adapter":19,"snabbdom":65,"xstream":98}],14:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var transposition_1 = require('./transposition');
var HTMLSource_1 = require('./HTMLSource');
var toHTML = require('snabbdom-to-html');
/* tslint:disable:no-empty */
var noop = function () { };
/* tslint:enable:no-empty */
function makeHTMLDriver(effect, options) {
    if (!options) {
        options = {};
    }
    var transposition = options.transposition || false;
    function htmlDriver(vnode$, runStreamAdapter) {
        var transposeVNode = transposition_1.makeTransposeVNode(runStreamAdapter);
        var preprocessedVNode$ = (transposition ? vnode$.map(transposeVNode).flatten() : vnode$);
        var html$ = preprocessedVNode$.last().map(toHTML);
        html$.addListener({
            next: effect || noop,
            error: noop,
            complete: noop,
        });
        return new HTMLSource_1.HTMLSource(html$, runStreamAdapter);
    }
    ;
    htmlDriver.streamAdapter = xstream_adapter_1.default;
    return htmlDriver;
}
exports.makeHTMLDriver = makeHTMLDriver;

},{"./HTMLSource":3,"./transposition":17,"@cycle/xstream-adapter":19,"snabbdom-to-html":25}],15:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var xstream_1 = require('xstream');
var MockedDOMSource = (function () {
    function MockedDOMSource(_streamAdapter, _mockConfig) {
        this._streamAdapter = _streamAdapter;
        this._mockConfig = _mockConfig;
        if (_mockConfig.elements) {
            this._elements = _mockConfig.elements;
        }
        else {
            this._elements = _streamAdapter.adapt(xstream_1.default.empty(), xstream_adapter_1.default.streamSubscribe);
        }
    }
    MockedDOMSource.prototype.elements = function () {
        return this._elements;
    };
    MockedDOMSource.prototype.events = function (eventType, options) {
        var mockConfig = this._mockConfig;
        var keys = Object.keys(mockConfig);
        var keysLen = keys.length;
        for (var i = 0; i < keysLen; i++) {
            var key = keys[i];
            if (key === eventType) {
                return mockConfig[key];
            }
        }
        return this._streamAdapter.adapt(xstream_1.default.empty(), xstream_adapter_1.default.streamSubscribe);
    };
    MockedDOMSource.prototype.select = function (selector) {
        var mockConfig = this._mockConfig;
        var keys = Object.keys(mockConfig);
        var keysLen = keys.length;
        for (var i = 0; i < keysLen; i++) {
            var key = keys[i];
            if (key === selector) {
                return new MockedDOMSource(this._streamAdapter, mockConfig[key]);
            }
        }
        return new MockedDOMSource(this._streamAdapter, {});
    };
    return MockedDOMSource;
}());
exports.MockedDOMSource = MockedDOMSource;
function mockDOMSource(streamAdapter, mockConfig) {
    return new MockedDOMSource(streamAdapter, mockConfig);
}
exports.mockDOMSource = mockDOMSource;

},{"@cycle/xstream-adapter":19,"xstream":98}],16:[function(require,module,exports){
"use strict";
var ClassModule = require('snabbdom/modules/class');
exports.ClassModule = ClassModule;
var PropsModule = require('snabbdom/modules/props');
exports.PropsModule = PropsModule;
var AttrsModule = require('snabbdom/modules/attributes');
exports.AttrsModule = AttrsModule;
var EventsModule = require('snabbdom/modules/eventlisteners');
exports.EventsModule = EventsModule;
var StyleModule = require('snabbdom/modules/style');
exports.StyleModule = StyleModule;
var HeroModule = require('snabbdom/modules/hero');
exports.HeroModule = HeroModule;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [StyleModule, ClassModule, PropsModule, AttrsModule];

},{"snabbdom/modules/attributes":59,"snabbdom/modules/class":60,"snabbdom/modules/eventlisteners":61,"snabbdom/modules/hero":62,"snabbdom/modules/props":63,"snabbdom/modules/style":64}],17:[function(require,module,exports){
"use strict";
var xstream_adapter_1 = require('@cycle/xstream-adapter');
var xstream_1 = require('xstream');
function createVTree(vnode, children) {
    return {
        sel: vnode.sel,
        data: vnode.data,
        text: vnode.text,
        elm: vnode.elm,
        key: vnode.key,
        children: children,
    };
}
function makeTransposeVNode(runStreamAdapter) {
    return function transposeVNode(vnode) {
        if (!vnode) {
            return null;
        }
        else if (vnode && typeof vnode.data === "object" && vnode.data.static) {
            return xstream_1.default.of(vnode);
        }
        else if (runStreamAdapter.isValidStream(vnode)) {
            var xsStream = xstream_adapter_1.default.adapt(vnode, runStreamAdapter.streamSubscribe);
            return xsStream.map(transposeVNode).flatten();
        }
        else if (typeof vnode === "object") {
            if (!vnode.children || vnode.children.length === 0) {
                return xstream_1.default.of(vnode);
            }
            var vnodeChildren = vnode.children
                .map(transposeVNode)
                .filter(function (x) { return x !== null; });
            if (vnodeChildren.length === 0) {
                return xstream_1.default.of(createVTree(vnode, []));
            }
            else {
                return xstream_1.default.combine.apply(xstream_1.default, vnodeChildren)
                    .map(function (children) { return createVTree(vnode, children.slice()); });
            }
        }
        else {
            throw new Error("Unhandled vTree Value");
        }
    };
}
exports.makeTransposeVNode = makeTransposeVNode;

},{"@cycle/xstream-adapter":19,"xstream":98}],18:[function(require,module,exports){
"use strict";
function isElement(obj) {
    return typeof HTMLElement === "object" ?
        obj instanceof HTMLElement || obj instanceof DocumentFragment :
        obj && typeof obj === "object" && obj !== null &&
            (obj.nodeType === 1 || obj.nodeType === 11) &&
            typeof obj.nodeName === "string";
}
exports.SCOPE_PREFIX = "$$CYCLEDOM$$-";
function getElement(selectors) {
    var domElement = (typeof selectors === "string" ?
        document.querySelector(selectors) :
        selectors);
    if (typeof selectors === "string" && domElement === null) {
        throw new Error("Cannot render into unknown element `" + selectors + "`");
    }
    else if (!isElement(domElement)) {
        throw new Error("Given container is not a DOM element neither a " +
            "selector string.");
    }
    return domElement;
}
exports.getElement = getElement;
function getScope(namespace) {
    return namespace
        .filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) > -1; })
        .slice(-1) // only need the latest, most specific, isolated boundary
        .join("");
}
exports.getScope = getScope;
function getSelectors(namespace) {
    return namespace.filter(function (c) { return c.indexOf(exports.SCOPE_PREFIX) === -1; }).join(" ");
}
exports.getSelectors = getSelectors;

},{}],19:[function(require,module,exports){
"use strict";
var xstream_1 = require('xstream');
var XStreamAdapter = {
    adapt: function (originStream, originStreamSubscribe) {
        if (XStreamAdapter.isValidStream(originStream)) {
            return originStream;
        }
        ;
        var dispose = null;
        return xstream_1.default.create({
            start: function (out) {
                var observer = out;
                dispose = originStreamSubscribe(originStream, observer);
            },
            stop: function () {
                if (typeof dispose === 'function') {
                    dispose();
                }
            }
        });
    },
    makeSubject: function () {
        var stream = xstream_1.default.create();
        var observer = {
            next: function (x) { stream.shamefullySendNext(x); },
            error: function (err) { stream.shamefullySendError(err); },
            complete: function () { stream.shamefullySendComplete(); }
        };
        return { observer: observer, stream: stream };
    },
    remember: function (stream) {
        return stream.remember();
    },
    isValidStream: function (stream) {
        return (typeof stream.addListener === 'function' &&
            typeof stream.shamefullySendNext === 'function');
    },
    streamSubscribe: function (stream, observer) {
        stream.addListener(observer);
        return function () { return stream.removeListener(observer); };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = XStreamAdapter;

},{"xstream":98}],20:[function(require,module,exports){
'use strict';

var proto = Element.prototype;
var vendor = proto.matches
  || proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = el.parentNode.querySelectorAll(selector);
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] == el) return true;
  }
  return false;
}
},{}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = classNameFromVNode;

var _selectorParser2 = require('./selectorParser');

var _selectorParser3 = _interopRequireDefault(_selectorParser2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function classNameFromVNode(vNode) {
  var _selectorParser = (0, _selectorParser3.default)(vNode.sel);

  var cn = _selectorParser.className;

  if (!vNode.data) {
    return cn;
  }

  var _vNode$data = vNode.data;
  var dataClass = _vNode$data.class;
  var props = _vNode$data.props;

  if (dataClass) {
    var c = Object.keys(vNode.data.class).filter(function (cl) {
      return vNode.data.class[cl];
    });
    cn += ' ' + c.join(' ');
  }

  if (props && props.className) {
    cn += ' ' + props.className;
  }

  return cn.trim();
}
},{"./selectorParser":22}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = selectorParser;

var _browserSplit = require('browser-split');

var _browserSplit2 = _interopRequireDefault(_browserSplit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

function selectorParser() {
  var selector = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

  var tagName = undefined;
  var id = '';
  var classes = [];

  var tagParts = (0, _browserSplit2.default)(selector, classIdSplit);

  if (notClassId.test(tagParts[1]) || selector === '') {
    tagName = 'div';
  }

  var part = undefined;
  var type = undefined;
  var i = undefined;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes.push(part.substring(1, part.length));
    } else if (type === '#') {
      id = part.substring(1, part.length);
    }
  }

  return {
    tagName: tagName,
    id: id,
    className: classes.join(' ')
  };
}
},{"browser-split":23}],23:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],24:[function(require,module,exports){

// All SVG children elements, not in this list, should self-close

module.exports = {
  // http://www.w3.org/TR/SVG/intro.html#TermContainerElement
  'a': true,
  'defs': true,
  'glyph': true,
  'g': true,
  'marker': true,
  'mask': true,
  'missing-glyph': true,
  'pattern': true,
  'svg': true,
  'switch': true,
  'symbol': true,

  // http://www.w3.org/TR/SVG/intro.html#TermDescriptiveElement
  'desc': true,
  'metadata': true,
  'title': true
};
},{}],25:[function(require,module,exports){

var init = require('./init');

module.exports = init([require('./modules/attributes'), require('./modules/style')]);
},{"./init":26,"./modules/attributes":27,"./modules/style":28}],26:[function(require,module,exports){

var parseSelector = require('./parse-selector');
var VOID_ELEMENTS = require('./void-elements');
var CONTAINER_ELEMENTS = require('./container-elements');

module.exports = function init(modules) {
  function parse(data) {
    return modules.reduce(function (arr, fn) {
      arr.push(fn(data));
      return arr;
    }, []).filter(function (result) {
      return result !== '';
    });
  }

  return function renderToString(vnode) {
    if (!vnode.sel && vnode.text) {
      return vnode.text;
    }

    vnode.data = vnode.data || {};

    // Support thunks
    if (typeof vnode.sel === 'string' && vnode.sel.slice(0, 5) === 'thunk') {
      vnode = vnode.data.fn.apply(null, vnode.data.args);
    }

    var tagName = parseSelector(vnode.sel).tagName;
    var attributes = parse(vnode);
    var svg = vnode.data.ns === 'http://www.w3.org/2000/svg';
    var tag = [];

    // Open tag
    tag.push('<' + tagName);
    if (attributes.length) {
      tag.push(' ' + attributes.join(' '));
    }
    if (svg && CONTAINER_ELEMENTS[tagName] !== true) {
      tag.push(' /');
    }
    tag.push('>');

    // Close tag, if needed
    if (VOID_ELEMENTS[tagName] !== true && !svg || svg && CONTAINER_ELEMENTS[tagName] === true) {
      if (vnode.data.props && vnode.data.props.innerHTML) {
        tag.push(vnode.data.props.innerHTML);
      } else if (vnode.text) {
        tag.push(vnode.text);
      } else if (vnode.children) {
        vnode.children.forEach(function (child) {
          tag.push(renderToString(child));
        });
      }
      tag.push('</' + tagName + '>');
    }

    return tag.join('');
  };
};
},{"./container-elements":24,"./parse-selector":29,"./void-elements":30}],27:[function(require,module,exports){

var forOwn = require('lodash.forown');
var escape = require('lodash.escape');
var union = require('lodash.union');

var parseSelector = require('../parse-selector');

// data.attrs, data.props, data.class

module.exports = function attributes(vnode) {
  var selector = parseSelector(vnode.sel);
  var parsedClasses = selector.className.split(' ');

  var attributes = [];
  var classes = [];
  var values = {};

  if (selector.id) {
    values.id = selector.id;
  }

  setAttributes(vnode.data.props, values);
  setAttributes(vnode.data.attrs, values); // `attrs` override `props`, not sure if this is good so

  if (vnode.data.class) {
    // Omit `className` attribute if `class` is set on vnode
    values.class = undefined;
  }
  forOwn(vnode.data.class, function (value, key) {
    if (value === true) {
      classes.push(key);
    }
  });
  classes = union(classes, values.class, parsedClasses).filter(function (x) {
    return x !== '';
  });

  if (classes.length) {
    values.class = classes.join(' ');
  }

  forOwn(values, function (value, key) {
    attributes.push(value === true ? key : key + '="' + escape(value) + '"');
  });

  return attributes.length ? attributes.join(' ') : '';
};

function setAttributes(values, target) {
  forOwn(values, function (value, key) {
    if (key === 'htmlFor') {
      target['for'] = value;
      return;
    }
    if (key === 'className') {
      target['class'] = value.split(' ');
      return;
    }
    if (key === 'innerHTML') {
      return;
    }
    target[key] = value;
  });
}
},{"../parse-selector":29,"lodash.escape":32,"lodash.forown":34,"lodash.union":46}],28:[function(require,module,exports){
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var forOwn = require('lodash.forown');
var escape = require('lodash.escape');
var kebabCase = require('lodash.kebabcase');

// data.style

module.exports = function style(vnode) {
  var styles = [];
  var style = vnode.data.style || {};

  // merge in `delayed` properties
  if (style.delayed) {
    _extends(style, style.delayed);
  }

  forOwn(style, function (value, key) {
    // omit hook objects
    if (typeof value === 'string') {
      styles.push(kebabCase(key) + ': ' + escape(value));
    }
  });

  return styles.length ? 'style="' + styles.join('; ') + '"' : '';
};
},{"lodash.escape":32,"lodash.forown":34,"lodash.kebabcase":41}],29:[function(require,module,exports){

// https://github.com/Matt-Esch/virtual-dom/blob/master/virtual-hyperscript/parse-tag.js

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = function parseSelector(selector, upper) {
  selector = selector || '';
  var tagName;
  var id = '';
  var classes = [];

  var tagParts = split(selector, classIdSplit);

  if (notClassId.test(tagParts[1]) || selector === '') {
    tagName = 'div';
  }

  var part, type, i;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes.push(part.substring(1, part.length));
    } else if (type === '#') {
      id = part.substring(1, part.length);
    }
  }

  return {
    tagName: upper === true ? tagName.toUpperCase() : tagName,
    id: id,
    className: classes.join(' ')
  };
};
},{"browser-split":31}],30:[function(require,module,exports){

// http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements

module.exports = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};
},{}],31:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],32:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match HTML entities and HTML characters. */
var reUnescapedHtml = /[&<>"'`]/g,
    reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

/** Used to map characters to HTML entities. */
var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

/**
 * Used by `_.escape` to convert characters to HTML entities.
 *
 * @private
 * @param {string} chr The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
function escapeHtmlChar(chr) {
  return htmlEscapes[chr];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Converts the characters "&", "<", ">", '"', "'", and "\`" in `string` to
 * their corresponding HTML entities.
 *
 * **Note:** No other characters are escaped. To escape additional
 * characters use a third-party library like [_he_](https://mths.be/he).
 *
 * Though the ">" character is escaped for symmetry, characters like
 * ">" and "/" don't need escaping in HTML and have no special meaning
 * unless they're part of a tag or unquoted attribute value.
 * See [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
 * (under "semi-related fun fact") for more details.
 *
 * Backticks are escaped because in IE < 9, they can break out of
 * attribute values or HTML comments. See [#59](https://html5sec.org/#59),
 * [#102](https://html5sec.org/#102), [#108](https://html5sec.org/#108), and
 * [#133](https://html5sec.org/#133) of the [HTML5 Security Cheatsheet](https://html5sec.org/)
 * for more details.
 *
 * When working with HTML you should always [quote attribute values](http://wonko.com/post/html-escaping)
 * to reduce XSS vectors.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escape('fred, barney, & pebbles');
 * // => 'fred, barney, &amp; pebbles'
 */
function escape(string) {
  string = toString(string);
  return (string && reHasUnescapedHtml.test(string))
    ? string.replace(reUnescapedHtml, escapeHtmlChar)
    : string;
}

module.exports = escape;

},{"lodash._root":33}],33:[function(require,module,exports){
(function (global){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to determine if values are of the language type `Object`. */
var objectTypes = {
  'function': true,
  'object': true
};

/** Detect free variable `exports`. */
var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
  ? exports
  : undefined;

/** Detect free variable `module`. */
var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
  ? module
  : undefined;

/** Detect free variable `global` from Node.js. */
var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

/** Detect free variable `self`. */
var freeSelf = checkGlobal(objectTypes[typeof self] && self);

/** Detect free variable `window`. */
var freeWindow = checkGlobal(objectTypes[typeof window] && window);

/** Detect `this` as the global object. */
var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

/**
 * Used as a reference to the global object.
 *
 * The `this` value is used if it's the global object to avoid Greasemonkey's
 * restricted `window` object, otherwise the `window` object is used.
 */
var root = freeGlobal ||
  ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
    freeSelf || thisGlobal || Function('return this')();

/**
 * Checks if `value` is a global object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {null|Object} Returns `value` if it's a global object, else `null`.
 */
function checkGlobal(value) {
  return (value && value.Object === Object) ? value : null;
}

module.exports = root;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],34:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFor = require('lodash._basefor'),
    bindCallback = require('lodash._bindcallback'),
    keys = require('lodash.keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

/**
 * Creates a function for `_.forOwn` or `_.forOwnRight`.
 *
 * @private
 * @param {Function} objectFunc The function to iterate over an object.
 * @returns {Function} Returns the new each function.
 */
function createForOwn(objectFunc) {
  return function(object, iteratee, thisArg) {
    if (typeof iteratee != 'function' || thisArg !== undefined) {
      iteratee = bindCallback(iteratee, thisArg, 3);
    }
    return objectFunc(object, iteratee);
  };
}

/**
 * Iterates over own enumerable properties of an object invoking `iteratee`
 * for each property. The `iteratee` is bound to `thisArg` and invoked with
 * three arguments: (value, key, object). Iteratee functions may exit iteration
 * early by explicitly returning `false`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.forOwn(new Foo, function(value, key) {
 *   console.log(key);
 * });
 * // => logs 'a' and 'b' (iteration order is not guaranteed)
 */
var forOwn = createForOwn(baseForOwn);

module.exports = forOwn;

},{"lodash._basefor":35,"lodash._bindcallback":36,"lodash.keys":37}],35:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for methods like `_.forIn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = baseFor;

},{}],36:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],37:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":38,"lodash.isarguments":39,"lodash.isarray":40}],38:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],39:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value)) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object, else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array and weak map constructors,
  // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is loosely based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isArguments;

},{}],40:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],41:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var deburr = require('lodash.deburr'),
    words = require('lodash.words');

/**
 * A specialized version of `_.reduce` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {*} [accumulator] The initial value.
 * @param {boolean} [initAccum] Specify using the first element of `array` as the initial value.
 * @returns {*} Returns the accumulated value.
 */
function arrayReduce(array, iteratee, accumulator, initAccum) {
  var index = -1,
      length = array.length;

  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}

/**
 * Creates a function like `_.camelCase`.
 *
 * @private
 * @param {Function} callback The function to combine each word.
 * @returns {Function} Returns the new compounder function.
 */
function createCompounder(callback) {
  return function(string) {
    return arrayReduce(words(deburr(string)), callback, '');
  };
}

/**
 * Converts `string` to [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to convert.
 * @returns {string} Returns the kebab cased string.
 * @example
 *
 * _.kebabCase('Foo Bar');
 * // => 'foo-bar'
 *
 * _.kebabCase('fooBar');
 * // => 'foo-bar'
 *
 * _.kebabCase('__foo_bar__');
 * // => 'foo-bar'
 */
var kebabCase = createCompounder(function(result, word, index) {
  return result + (index ? '-' : '') + word.toLowerCase();
});

module.exports = kebabCase;

},{"lodash.deburr":42,"lodash.words":44}],42:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match latin-1 supplementary letters (excluding mathematical operators). */
var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;

/** Used to compose unicode character classes. */
var rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0';

/** Used to compose unicode capture groups. */
var rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']';

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
var reComboMark = RegExp(rsCombo, 'g');

/** Used to map latin-1 supplementary letters to basic latin letters. */
var deburredLetters = {
  '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
  '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
  '\xc7': 'C',  '\xe7': 'c',
  '\xd0': 'D',  '\xf0': 'd',
  '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
  '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
  '\xcC': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
  '\xeC': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
  '\xd1': 'N',  '\xf1': 'n',
  '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
  '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
  '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
  '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
  '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
  '\xc6': 'Ae', '\xe6': 'ae',
  '\xde': 'Th', '\xfe': 'th',
  '\xdf': 'ss'
};

/**
 * Used by `_.deburr` to convert latin-1 supplementary letters to basic latin letters.
 *
 * @private
 * @param {string} letter The matched letter to deburr.
 * @returns {string} Returns the deburred letter.
 */
function deburrLetter(letter) {
  return deburredLetters[letter];
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Deburrs `string` by converting [latin-1 supplementary letters](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
 * to basic latin letters and removing [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to deburr.
 * @returns {string} Returns the deburred string.
 * @example
 *
 * _.deburr('déjà vu');
 * // => 'deja vu'
 */
function deburr(string) {
  string = toString(string);
  return string && string.replace(reLatin1, deburrLetter).replace(reComboMark, '');
}

module.exports = deburr;

},{"lodash._root":43}],43:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],44:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var root = require('lodash._root');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to compose unicode character classes. */
var rsAstralRange = '\\ud800-\\udfff',
    rsComboMarksRange = '\\u0300-\\u036f\\ufe20-\\ufe23',
    rsComboSymbolsRange = '\\u20d0-\\u20f0',
    rsDingbatRange = '\\u2700-\\u27bf',
    rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
    rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
    rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
    rsQuoteRange = '\\u2018\\u2019\\u201c\\u201d',
    rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
    rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
    rsVarRange = '\\ufe0e\\ufe0f',
    rsBreakRange = rsMathOpRange + rsNonCharRange + rsQuoteRange + rsSpaceRange;

/** Used to compose unicode capture groups. */
var rsBreak = '[' + rsBreakRange + ']',
    rsCombo = '[' + rsComboMarksRange + rsComboSymbolsRange + ']',
    rsDigits = '\\d+',
    rsDingbat = '[' + rsDingbatRange + ']',
    rsLower = '[' + rsLowerRange + ']',
    rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
    rsFitz = '\\ud83c[\\udffb-\\udfff]',
    rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
    rsNonAstral = '[^' + rsAstralRange + ']',
    rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
    rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
    rsUpper = '[' + rsUpperRange + ']',
    rsZWJ = '\\u200d';

/** Used to compose unicode regexes. */
var rsLowerMisc = '(?:' + rsLower + '|' + rsMisc + ')',
    rsUpperMisc = '(?:' + rsUpper + '|' + rsMisc + ')',
    reOptMod = rsModifier + '?',
    rsOptVar = '[' + rsVarRange + ']?',
    rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
    rsSeq = rsOptVar + reOptMod + rsOptJoin,
    rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq;

/** Used to match non-compound words composed of alphanumeric characters. */
var reBasicWord = /[a-zA-Z0-9]+/g;

/** Used to match complex or compound words. */
var reComplexWord = RegExp([
  rsUpper + '?' + rsLower + '+(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
  rsUpperMisc + '+(?=' + [rsBreak, rsUpper + rsLowerMisc, '$'].join('|') + ')',
  rsUpper + '?' + rsLowerMisc + '+',
  rsUpper + '+',
  rsDigits,
  rsEmoji
].join('|'), 'g');

/** Used to detect strings that need a more robust regexp to match words. */
var reHasComplexWord = /[a-z][A-Z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = Symbol ? symbolProto.toString : undefined;

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (isSymbol(value)) {
    return Symbol ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Splits `string` into an array of its words.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to inspect.
 * @param {RegExp|string} [pattern] The pattern to match words.
 * @param- {Object} [guard] Enables use as an iteratee for functions like `_.map`.
 * @returns {Array} Returns the words of `string`.
 * @example
 *
 * _.words('fred, barney, & pebbles');
 * // => ['fred', 'barney', 'pebbles']
 *
 * _.words('fred, barney, & pebbles', /[^, ]+/g);
 * // => ['fred', 'barney', '&', 'pebbles']
 */
function words(string, pattern, guard) {
  string = toString(string);
  pattern = guard ? undefined : pattern;

  if (pattern === undefined) {
    pattern = reHasComplexWord.test(string) ? reComplexWord : reBasicWord;
  }
  return string.match(pattern) || [];
}

module.exports = words;

},{"lodash._root":45}],45:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],46:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFlatten = require('lodash._baseflatten'),
    baseUniq = require('lodash._baseuniq'),
    restParam = require('lodash.restparam');

/**
 * Creates an array of unique values, in order, of the provided arrays using
 * `SameValueZero` for equality comparisons.
 *
 * **Note:** [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
 * comparisons are like strict equality comparisons, e.g. `===`, except that
 * `NaN` matches `NaN`.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @returns {Array} Returns the new array of combined values.
 * @example
 *
 * _.union([1, 2], [4, 2], [2, 1]);
 * // => [1, 2, 4]
 */
var union = restParam(function(arrays) {
  return baseUniq(baseFlatten(arrays, false, true));
});

module.exports = union;

},{"lodash._baseflatten":47,"lodash._baseuniq":50,"lodash.restparam":55}],47:[function(require,module,exports){
/**
 * lodash 3.1.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = baseFlatten;

},{"lodash.isarguments":48,"lodash.isarray":49}],48:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],49:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],50:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseIndexOf = require('lodash._baseindexof'),
    cacheIndexOf = require('lodash._cacheindexof'),
    createCache = require('lodash._createcache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * The base implementation of `_.uniq` without support for callback shorthands
 * and `this` binding.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} [iteratee] The function invoked per iteration.
 * @returns {Array} Returns the new duplicate-value-free array.
 */
function baseUniq(array, iteratee) {
  var index = -1,
      indexOf = baseIndexOf,
      length = array.length,
      isCommon = true,
      isLarge = isCommon && length >= LARGE_ARRAY_SIZE,
      seen = isLarge ? createCache() : null,
      result = [];

  if (seen) {
    indexOf = cacheIndexOf;
    isCommon = false;
  } else {
    isLarge = false;
    seen = iteratee ? [] : result;
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee ? iteratee(value, index, array) : value;

    if (isCommon && value === value) {
      var seenIndex = seen.length;
      while (seenIndex--) {
        if (seen[seenIndex] === computed) {
          continue outer;
        }
      }
      if (iteratee) {
        seen.push(computed);
      }
      result.push(value);
    }
    else if (indexOf(seen, computed, 0) < 0) {
      if (iteratee || isLarge) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

module.exports = baseUniq;

},{"lodash._baseindexof":51,"lodash._cacheindexof":52,"lodash._createcache":53}],51:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `_.indexOf` without support for binary searches.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return indexOfNaN(array, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * Gets the index at which the first occurrence of `NaN` is found in `array`.
 * If `fromRight` is provided elements of `array` are iterated from right to left.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched `NaN`, else `-1`.
 */
function indexOfNaN(array, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 0 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    var other = array[index];
    if (other !== other) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOf;

},{}],52:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is in `cache` mimicking the return signature of
 * `_.indexOf` by returning `0` if the value is found, else `-1`.
 *
 * @private
 * @param {Object} cache The cache to search.
 * @param {*} value The value to search for.
 * @returns {number} Returns `0` if `value` is found, else `-1`.
 */
function cacheIndexOf(cache, value) {
  var data = cache.data,
      result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

  return result ? 0 : -1;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = cacheIndexOf;

},{}],53:[function(require,module,exports){
(function (global){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative');

/** Native method references. */
var Set = getNative(global, 'Set');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeCreate = getNative(Object, 'create');

/**
 *
 * Creates a cache object to store unique values.
 *
 * @private
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var length = values ? values.length : 0;

  this.data = { 'hash': nativeCreate(null), 'set': new Set };
  while (length--) {
    this.push(values[length]);
  }
}

/**
 * Adds `value` to the cache.
 *
 * @private
 * @name push
 * @memberOf SetCache
 * @param {*} value The value to cache.
 */
function cachePush(value) {
  var data = this.data;
  if (typeof value == 'string' || isObject(value)) {
    data.set.add(value);
  } else {
    data.hash[value] = true;
  }
}

/**
 * Creates a `Set` cache object to optimize linear searches of large arrays.
 *
 * @private
 * @param {Array} [values] The values to cache.
 * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
 */
function createCache(values) {
  return (nativeCreate && Set) ? new SetCache(values) : null;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

// Add functions to the `Set` cache.
SetCache.prototype.push = cachePush;

module.exports = createCache;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash._getnative":54}],54:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],55:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],56:[function(require,module,exports){
var VNode = require('./vnode');
var is = require('./is');

function addNS(data, children) {
  data.ns = 'http://www.w3.org/2000/svg';
  if (children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (arguments.length === 3) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (arguments.length === 2) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children);
  }
  return VNode(sel, data, children, text, undefined);
};

},{"./is":58,"./vnode":67}],57:[function(require,module,exports){
function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
  node.textContent = text;
}

module.exports = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};

},{}],58:[function(require,module,exports){
module.exports = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};

},{}],59:[function(require,module,exports){
var booleanAttrs = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "compact", "controls", "declare", 
                "default", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disabled", "draggable", 
                "enabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "itemscope", "loop", "multiple", 
                "muted", "nohref", "noresize", "noshade", "novalidate", "nowrap", "open", "pauseonexit", "readonly", 
                "required", "reversed", "scoped", "seamless", "selected", "sortable", "spellcheck", "translate", 
                "truespeed", "typemustmatch", "visible"];
    
var booleanAttrsDict = {};
for(var i=0, len = booleanAttrs.length; i < len; i++) {
  booleanAttrsDict[booleanAttrs[i]] = true;
}
    
function updateAttrs(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldAttrs = oldVnode.data.attrs || {}, attrs = vnode.data.attrs || {};
  
  // update modified attributes, add new attributes
  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      // TODO: add support to namespaced attributes (setAttributeNS)
      if(!cur && booleanAttrsDict[key])
        elm.removeAttribute(key);
      else
        elm.setAttribute(key, cur);
    }
  }
  //remove removed attributes
  // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
  // the other option is to remove all attributes with value == undefined
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}

module.exports = {create: updateAttrs, update: updateAttrs};

},{}],60:[function(require,module,exports){
function updateClass(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldClass = oldVnode.data.class || {},
      klass = vnode.data.class || {};
  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

module.exports = {create: updateClass, update: updateClass};

},{}],61:[function(require,module,exports){
var is = require('../is');

function arrInvoker(arr) {
  return function() {
    // Special case when length is two, for performance
    arr.length === 2 ? arr[0](arr[1]) : arr[0].apply(undefined, arr.slice(1));
  };
}

function fnInvoker(o) {
  return function(ev) { o.fn(ev); };
}

function updateEventListeners(oldVnode, vnode) {
  var name, cur, old, elm = vnode.elm,
      oldOn = oldVnode.data.on || {}, on = vnode.data.on;
  if (!on) return;
  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    if (old === undefined) {
      if (is.array(cur)) {
        elm.addEventListener(name, arrInvoker(cur));
      } else {
        cur = {fn: cur};
        on[name] = cur;
        elm.addEventListener(name, fnInvoker(cur));
      }
    } else if (is.array(old)) {
      // Deliberately modify old array since it's captured in closure created with `arrInvoker`
      old.length = cur.length;
      for (var i = 0; i < old.length; ++i) old[i] = cur[i];
      on[name]  = old;
    } else {
      old.fn = cur;
      on[name] = old;
    }
  }
}

module.exports = {create: updateEventListeners, update: updateEventListeners};

},{"../is":58}],62:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function getTextNodeRect(textNode) {
  var rect;
  if (document.createRange) {
    var range = document.createRange();
    range.selectNodeContents(textNode);
    if (range.getBoundingClientRect) {
        rect = range.getBoundingClientRect();
    }
  }
  return rect;
}

function calcTransformOrigin(isTextNode, textRect, boundingRect) {
  if (isTextNode) {
    if (textRect) {
      //calculate pixels to center of text from left edge of bounding box
      var relativeCenterX = textRect.left + textRect.width/2 - boundingRect.left;
      var relativeCenterY = textRect.top + textRect.height/2 - boundingRect.top;
      return relativeCenterX + 'px ' + relativeCenterY + 'px';
    }
  }
  return '0 0'; //top left
}

function getTextDx(oldTextRect, newTextRect) {
  if (oldTextRect && newTextRect) {
    return ((oldTextRect.left + oldTextRect.width/2) - (newTextRect.left + newTextRect.width/2));
  }
  return 0;
}
function getTextDy(oldTextRect, newTextRect) {
  if (oldTextRect && newTextRect) {
    return ((oldTextRect.top + oldTextRect.height/2) - (newTextRect.top + newTextRect.height/2));
  }
  return 0;
}

function isTextElement(elm) {
  return elm.childNodes.length === 1 && elm.childNodes[0].nodeType === 3;
}

var removed, created;

function pre(oldVnode, vnode) {
  removed = {};
  created = [];
}

function create(oldVnode, vnode) {
  var hero = vnode.data.hero;
  if (hero && hero.id) {
    created.push(hero.id);
    created.push(vnode);
  }
}

function destroy(vnode) {
  var hero = vnode.data.hero;
  if (hero && hero.id) {
    var elm = vnode.elm;
    vnode.isTextNode = isTextElement(elm); //is this a text node?
    vnode.boundingRect = elm.getBoundingClientRect(); //save the bounding rectangle to a new property on the vnode
    vnode.textRect = vnode.isTextNode ? getTextNodeRect(elm.childNodes[0]) : null; //save bounding rect of inner text node
    var computedStyle = window.getComputedStyle(elm, null); //get current styles (includes inherited properties)
    vnode.savedStyle = JSON.parse(JSON.stringify(computedStyle)); //save a copy of computed style values
    removed[hero.id] = vnode;
  }
}

function post() {
  var i, id, newElm, oldVnode, oldElm, hRatio, wRatio,
      oldRect, newRect, dx, dy, origTransform, origTransition,
      newStyle, oldStyle, newComputedStyle, isTextNode,
      newTextRect, oldTextRect;
  for (i = 0; i < created.length; i += 2) {
    id = created[i];
    newElm = created[i+1].elm;
    oldVnode = removed[id];
    if (oldVnode) {
      isTextNode = oldVnode.isTextNode && isTextElement(newElm); //Are old & new both text?
      newStyle = newElm.style;
      newComputedStyle = window.getComputedStyle(newElm, null); //get full computed style for new element
      oldElm = oldVnode.elm;
      oldStyle = oldElm.style;
      //Overall element bounding boxes
      newRect = newElm.getBoundingClientRect();
      oldRect = oldVnode.boundingRect; //previously saved bounding rect
      //Text node bounding boxes & distances
      if (isTextNode) {
        newTextRect = getTextNodeRect(newElm.childNodes[0]);
        oldTextRect = oldVnode.textRect;
        dx = getTextDx(oldTextRect, newTextRect);
        dy = getTextDy(oldTextRect, newTextRect);
      } else {
        //Calculate distances between old & new positions
        dx = oldRect.left - newRect.left;
        dy = oldRect.top - newRect.top;
      }
      hRatio = newRect.height / (Math.max(oldRect.height, 1));
      wRatio = isTextNode ? hRatio : newRect.width / (Math.max(oldRect.width, 1)); //text scales based on hRatio
      // Animate new element
      origTransform = newStyle.transform;
      origTransition = newStyle.transition;
      if (newComputedStyle.display === 'inline') //inline elements cannot be transformed
        newStyle.display = 'inline-block';        //this does not appear to have any negative side effects
      newStyle.transition = origTransition + 'transform 0s';
      newStyle.transformOrigin = calcTransformOrigin(isTextNode, newTextRect, newRect);
      newStyle.opacity = '0';
      newStyle.transform = origTransform + 'translate('+dx+'px, '+dy+'px) ' +
                               'scale('+1/wRatio+', '+1/hRatio+')';
      setNextFrame(newStyle, 'transition', origTransition);
      setNextFrame(newStyle, 'transform', origTransform);
      setNextFrame(newStyle, 'opacity', '1');
      // Animate old element
      for (var key in oldVnode.savedStyle) { //re-apply saved inherited properties
        if (parseInt(key) != key) {
          var ms = key.substring(0,2) === 'ms';
          var moz = key.substring(0,3) === 'moz';
          var webkit = key.substring(0,6) === 'webkit';
      	  if (!ms && !moz && !webkit) //ignore prefixed style properties
        	  oldStyle[key] = oldVnode.savedStyle[key];
        }
      }
      oldStyle.position = 'absolute';
      oldStyle.top = oldRect.top + 'px'; //start at existing position
      oldStyle.left = oldRect.left + 'px';
      oldStyle.width = oldRect.width + 'px'; //Needed for elements who were sized relative to their parents
      oldStyle.height = oldRect.height + 'px'; //Needed for elements who were sized relative to their parents
      oldStyle.margin = 0; //Margin on hero element leads to incorrect positioning
      oldStyle.transformOrigin = calcTransformOrigin(isTextNode, oldTextRect, oldRect);
      oldStyle.transform = '';
      oldStyle.opacity = '1';
      document.body.appendChild(oldElm);
      setNextFrame(oldStyle, 'transform', 'translate('+ -dx +'px, '+ -dy +'px) scale('+wRatio+', '+hRatio+')'); //scale must be on far right for translate to be correct
      setNextFrame(oldStyle, 'opacity', '0');
      oldElm.addEventListener('transitionend', function(ev) {
        if (ev.propertyName === 'transform')
          document.body.removeChild(ev.target);
      });
    }
  }
  removed = created = undefined;
}

module.exports = {pre: pre, create: create, destroy: destroy, post: post};

},{}],63:[function(require,module,exports){
function updateProps(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldProps = oldVnode.data.props || {}, props = vnode.data.props || {};
  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key];
    }
  }
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}

module.exports = {create: updateProps, update: updateProps};

},{}],64:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function updateStyle(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldStyle = oldVnode.data.style || {},
      style = vnode.data.style || {},
      oldHasDel = 'delayed' in oldStyle;
  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = '';
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame(elm.style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      elm.style[name] = cur;
    }
  }
}

function applyDestroyStyle(vnode) {
  var style, name, elm = vnode.elm, s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  var s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
      compStyle, style = s.remove, amount = 0, applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function(ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

module.exports = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};

},{}],65:[function(require,module,exports){
// jshint newcap: false
/* global require, module, document, Node */
'use strict';

var VNode = require('./vnode');
var is = require('./is');
var domApi = require('./htmldomapi.js');

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    return VNode(api.tagName(elm).toLowerCase(), {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode, insertedVnodeQueue) {
    var i, thunk, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode);
      if (isDef(i = data.vnode)) {
          thunk = vnode;
          vnode = i;
      }
    }
    var elm, children = vnode.children, sel = vnode.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot+1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text);
    }
    if (isDef(thunk)) thunk.elm = vnode.elm;
    return vnode.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode) {
    var i, j, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
      if (isDef(i = data.vnode)) invokeDestroyHook(i);
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i, listeners, rm, ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    if (isDef(i = oldVnode.data) && isDef(i = i.vnode)) oldVnode = i;
    if (isDef(i = vnode.data) && isDef(i = i.vnode)) {
      patchVnode(oldVnode, i, insertedVnodeQueue);
      vnode.elm = i.elm;
      return;
    }
    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
    if (oldVnode === vnode) return;
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      api.setTextContent(elm, vnode.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function(oldVnode, vnode) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}

module.exports = {init: init};

},{"./htmldomapi.js":57,"./is":58,"./vnode":67}],66:[function(require,module,exports){
var h = require('./h');

function init(thunk) {
  var i, cur = thunk.data;
  cur.vnode = cur.fn.apply(undefined, cur.args);
}

function prepatch(oldThunk, thunk) {
  var i, old = oldThunk.data, cur = thunk.data;
  var oldArgs = old.args, args = cur.args;
  cur.vnode = old.vnode;
  if (old.fn !== cur.fn || oldArgs.length !== args.length) {
    cur.vnode = cur.fn.apply(undefined, args);
    return;
  }
  for (i = 0; i < args.length; ++i) {
    if (oldArgs[i] !== args[i]) {
      cur.vnode = cur.fn.apply(undefined, args);
      return;
    }
  }
}

module.exports = function(name, fn /* args */) {
  var i, args = [];
  for (i = 2; i < arguments.length; ++i) {
    args[i - 2] = arguments[i];
  }
  return h('thunk' + name, {
    hook: {init: init, prepatch: prepatch},
    fn: fn, args: args,
  });
};

},{"./h":56}],67:[function(require,module,exports){
module.exports = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};

},{}],68:[function(require,module,exports){
"use strict";
var base_1 = require('@cycle/base');
var xstream_adapter_1 = require('@cycle/xstream-adapter');
/**
 * A function that prepares the Cycle application to be executed. Takes a `main`
 * function and prepares to circularly connects it to the given collection of
 * driver functions. As an output, `Cycle()` returns an object with three
 * properties: `sources`, `sinks` and `run`. Only when `run()` is called will
 * the application actually execute. Refer to the documentation of `run()` for
 * more details.
 *
 * **Example:**
 * ```js
 * const {sources, sinks, run} = Cycle(main, drivers);
 * // ...
 * const dispose = run(); // Executes the application
 * // ...
 * dispose();
 * ```
 *
 * @param {Function} main a function that takes `sources` as input
 * and outputs a collection of `sinks` Observables.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Object} an object with three properties: `sources`, `sinks` and
 * `run`. `sources` is the collection of driver sources, `sinks` is the
 * collection of driver sinks, these can be used for debugging or testing. `run`
 * is the function that once called will execute the application.
 * @function Cycle
 */
var Cycle = function (main, drivers) {
    return base_1.default(main, drivers, { streamAdapter: xstream_adapter_1.default });
};
/**
 * Takes a `main` function and circularly connects it to the given collection
 * of driver functions.
 *
 * **Example:**
 * ```js
 * const dispose = Cycle.run(main, drivers);
 * // ...
 * dispose();
 * ```
 *
 * The `main` function expects a collection of "source" Observables (returned
 * from drivers) as input, and should return a collection of "sink" Observables
 * (to be given to drivers). A "collection of Observables" is a JavaScript
 * object where keys match the driver names registered by the `drivers` object,
 * and values are the Observables. Refer to the documentation of each driver to
 * see more details on what types of sources it outputs and sinks it receives.
 *
 * @param {Function} main a function that takes `sources` as input
 * and outputs a collection of `sinks` Observables.
 * @param {Object} drivers an object where keys are driver names and values
 * are driver functions.
 * @return {Function} a dispose function, used to terminate the execution of the
 * Cycle.js program, cleaning up resources used.
 * @function run
 */
function run(main, drivers) {
    var run = base_1.default(main, drivers, { streamAdapter: xstream_adapter_1.default }).run;
    return run();
}
exports.run = run;
Cycle.run = run;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cycle;

},{"@cycle/base":69,"@cycle/xstream-adapter":70}],69:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function logToConsoleError(err) {
    var target = err.stack || err;
    if (console && console.error) {
        console.error(target);
    } else if (console && console.log) {
        console.log(target);
    }
}
function makeSinkProxies(drivers, streamAdapter) {
    var sinkProxies = {};
    for (var name_1 in drivers) {
        if (drivers.hasOwnProperty(name_1)) {
            var holdSubject = streamAdapter.makeSubject();
            var driverStreamAdapter = drivers[name_1].streamAdapter || streamAdapter;
            var stream = driverStreamAdapter.adapt(holdSubject.stream, streamAdapter.streamSubscribe);
            sinkProxies[name_1] = {
                stream: stream,
                observer: holdSubject.observer
            };
        }
    }
    return sinkProxies;
}
function callDrivers(drivers, sinkProxies, streamAdapter) {
    var sources = {};
    for (var name_2 in drivers) {
        if (drivers.hasOwnProperty(name_2)) {
            var driverOutput = drivers[name_2](sinkProxies[name_2].stream, streamAdapter, name_2);
            var driverStreamAdapter = drivers[name_2].streamAdapter;
            if (driverStreamAdapter && driverStreamAdapter.isValidStream(driverOutput)) {
                sources[name_2] = streamAdapter.adapt(driverOutput, driverStreamAdapter.streamSubscribe);
            } else {
                sources[name_2] = driverOutput;
            }
        }
    }
    return sources;
}
function replicateMany(sinks, sinkProxies, streamAdapter) {
    var results = Object.keys(sinks).filter(function (name) {
        return !!sinkProxies[name];
    }).map(function (name) {
        return streamAdapter.streamSubscribe(sinks[name], {
            next: function next(x) {
                sinkProxies[name].observer.next(x);
            },
            error: function error(err) {
                logToConsoleError(err);
                sinkProxies[name].observer.error(err);
            },
            complete: function complete(x) {
                sinkProxies[name].observer.complete(x);
            }
        });
    });
    var disposeFunctions = results.filter(function (dispose) {
        return typeof dispose === 'function';
    });
    return function () {
        disposeFunctions.forEach(function (dispose) {
            return dispose();
        });
    };
}
function disposeSources(sources) {
    for (var k in sources) {
        if (sources.hasOwnProperty(k) && sources[k] && typeof sources[k].dispose === 'function') {
            sources[k].dispose();
        }
    }
}
var isObjectEmpty = function isObjectEmpty(obj) {
    return Object.keys(obj).length === 0;
};
function Cycle(main, drivers, options) {
    if (typeof main !== "function") {
        throw new Error("First argument given to Cycle must be the 'main' " + "function.");
    }
    if ((typeof drivers === 'undefined' ? 'undefined' : _typeof(drivers)) !== "object" || drivers === null) {
        throw new Error("Second argument given to Cycle must be an object " + "with driver functions as properties.");
    }
    if (isObjectEmpty(drivers)) {
        throw new Error("Second argument given to Cycle must be an object " + "with at least one driver function declared as a property.");
    }
    var streamAdapter = options.streamAdapter;
    if (!streamAdapter || isObjectEmpty(streamAdapter)) {
        throw new Error("Third argument given to Cycle must be an options object " + "with the streamAdapter key supplied with a valid stream adapter.");
    }
    var sinkProxies = makeSinkProxies(drivers, streamAdapter);
    var sources = callDrivers(drivers, sinkProxies, streamAdapter);
    var sinks = main(sources);
    if (typeof window !== 'undefined') {
        window.Cyclejs = { sinks: sinks };
    }
    var run = function run() {
        var disposeReplication = replicateMany(sinks, sinkProxies, streamAdapter);
        return function () {
            disposeSources(sources);
            disposeReplication();
        };
    };
    return { sinks: sinks, sources: sources, run: run };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Cycle;


},{}],70:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19,"xstream":98}],71:[function(require,module,exports){

},{}],72:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":73,"ieee754":74,"isarray":75}],73:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],74:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],75:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],76:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],77:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],78:[function(require,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(obj != null &&
    (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
      (obj.constructor &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj))
    ))
}

},{}],79:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],80:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":81}],81:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":83,"./_stream_writable":85,"core-util-is":87,"inherits":77,"process-nextick-args":89}],82:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":84,"core-util-is":87,"inherits":77}],83:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

var hasPrependListener = typeof EE.prototype.prependListener === 'function';

function prependListener(emitter, event, fn) {
  if (hasPrependListener) return emitter.prependListener(event, fn);

  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS. This is here
  // only because this code needs to continue to work with older versions
  // of Node.js that do not include the prependListener() method. The goal
  // is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = bufferShim.from(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var _e = new Error('stream.unshift() after end event');
      stream.emit('error', _e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended) return 0;

  if (state.objectMode) return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length) return state.buffer[0].length;else return state.length;
  }

  if (n <= 0) return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading) n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended) state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0) endReadable(this);

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && !this._readableState.endEmitted) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0) return null;

  if (length === 0) ret = null;else if (objectMode) ret = list.shift();else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode) ret = list.join('');else if (list.length === 1) ret = list[0];else ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode) ret = '';else ret = bufferShim.allocUnsafe(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var _buf = list[0];
        var cpy = Math.min(n - c, _buf.length);

        if (stringMode) ret += _buf.slice(0, cpy);else _buf.copy(ret, c, 0, cpy);

        if (cpy < _buf.length) list[0] = _buf.slice(cpy);else list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":81,"_process":79,"buffer":72,"buffer-shims":86,"core-util-is":87,"events":76,"inherits":77,"isarray":88,"process-nextick-args":89,"string_decoder/":96,"util":71}],84:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('Not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":81,"core-util-is":87,"inherits":77}],85:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;
/*<replacement>*/
var bufferShim = require('buffer-shims');
/*</replacement>*/

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;
  // Always throw error if a null is written
  // if we are not in object mode then throw
  // if it is not a buffer, string, or undefined.
  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = bufferShim.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":81,"_process":79,"buffer":72,"buffer-shims":86,"core-util-is":87,"events":76,"inherits":77,"process-nextick-args":89,"util-deprecate":90}],86:[function(require,module,exports){
(function (global){
'use strict';

var buffer = require('buffer');
var Buffer = buffer.Buffer;
var SlowBuffer = buffer.SlowBuffer;
var MAX_LEN = buffer.kMaxLength || 2147483647;
exports.alloc = function alloc(size, fill, encoding) {
  if (typeof Buffer.alloc === 'function') {
    return Buffer.alloc(size, fill, encoding);
  }
  if (typeof encoding === 'number') {
    throw new TypeError('encoding must not be number');
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  var enc = encoding;
  var _fill = fill;
  if (_fill === undefined) {
    enc = undefined;
    _fill = 0;
  }
  var buf = new Buffer(size);
  if (typeof _fill === 'string') {
    var fillBuf = new Buffer(_fill, enc);
    var flen = fillBuf.length;
    var i = -1;
    while (++i < size) {
      buf[i] = fillBuf[i % flen];
    }
  } else {
    buf.fill(_fill);
  }
  return buf;
}
exports.allocUnsafe = function allocUnsafe(size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    return Buffer.allocUnsafe(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size > MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new Buffer(size);
}
exports.from = function from(value, encodingOrOffset, length) {
  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
    return Buffer.from(value, encodingOrOffset, length);
  }
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number');
  }
  if (typeof value === 'string') {
    return new Buffer(value, encodingOrOffset);
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    var offset = encodingOrOffset;
    if (arguments.length === 1) {
      return new Buffer(value);
    }
    if (typeof offset === 'undefined') {
      offset = 0;
    }
    var len = length;
    if (typeof len === 'undefined') {
      len = value.byteLength - offset;
    }
    if (offset >= value.byteLength) {
      throw new RangeError('\'offset\' is out of bounds');
    }
    if (len > value.byteLength - offset) {
      throw new RangeError('\'length\' is out of bounds');
    }
    return new Buffer(value.slice(offset, offset + len));
  }
  if (Buffer.isBuffer(value)) {
    var out = new Buffer(value.length);
    value.copy(out, 0, 0, value.length);
    return out;
  }
  if (value) {
    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
      return new Buffer(value);
    }
    if (value.type === 'Buffer' && Array.isArray(value.data)) {
      return new Buffer(value.data);
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
}
exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
  if (typeof Buffer.allocUnsafeSlow === 'function') {
    return Buffer.allocUnsafeSlow(size);
  }
  if (typeof size !== 'number') {
    throw new TypeError('size must be a number');
  }
  if (size >= MAX_LEN) {
    throw new RangeError('size is too large');
  }
  return new SlowBuffer(size);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"buffer":72}],87:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../../../insert-module-globals/node_modules/is-buffer/index.js")})
},{"../../../../insert-module-globals/node_modules/is-buffer/index.js":78}],88:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"dup":75}],89:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":79}],90:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],91:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":82}],92:[function(require,module,exports){
(function (process){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
  module.exports = Stream;
}

}).call(this,require('_process'))
},{"./lib/_stream_duplex.js":81,"./lib/_stream_passthrough.js":82,"./lib/_stream_readable.js":83,"./lib/_stream_transform.js":84,"./lib/_stream_writable.js":85,"_process":79}],93:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":84}],94:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":85}],95:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":76,"inherits":77,"readable-stream/duplex.js":80,"readable-stream/passthrough.js":91,"readable-stream/readable.js":92,"readable-stream/transform.js":93,"readable-stream/writable.js":94}],96:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":72}],97:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var empty = {};
function noop() { }
function copy(a) {
    var l = a.length;
    var b = Array(l);
    for (var i = 0; i < l; ++i) {
        b[i] = a[i];
    }
    return b;
}
exports.emptyIL = {
    _n: noop,
    _e: noop,
    _c: noop,
};
// mutates the input
function internalizeProducer(producer) {
    producer._start =
        function _start(il) {
            il.next = il._n;
            il.error = il._e;
            il.complete = il._c;
            this.start(il);
        };
    producer._stop = producer.stop;
}
function compose2(f1, f2) {
    return function composedFn(arg) {
        return f1(f2(arg));
    };
}
function and(f1, f2) {
    return function andFn(t) {
        return f1(t) && f2(t);
    };
}
var MergeProducer = (function () {
    function MergeProducer(insArr) {
        this.insArr = insArr;
        this.type = 'merge';
        this.out = null;
        this.ac = insArr.length;
    }
    MergeProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var L = s.length;
        for (var i = 0; i < L; i++) {
            s[i]._add(this);
        }
    };
    MergeProducer.prototype._stop = function () {
        var s = this.insArr;
        var L = s.length;
        for (var i = 0; i < L; i++) {
            s[i]._remove(this);
        }
        this.out = null;
        this.ac = L;
    };
    MergeProducer.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    MergeProducer.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MergeProducer.prototype._c = function () {
        if (--this.ac === 0) {
            var u = this.out;
            if (!u)
                return;
            u._c();
        }
    };
    return MergeProducer;
}());
exports.MergeProducer = MergeProducer;
var CombineListener = (function () {
    function CombineListener(i, out, p) {
        this.i = i;
        this.out = out;
        this.p = p;
        p.ils.push(this);
    }
    CombineListener.prototype._n = function (t) {
        var p = this.p, out = this.out;
        if (!out)
            return;
        if (p.up(t, this.i)) {
            out._n(p.vals);
        }
    };
    CombineListener.prototype._e = function (err) {
        var out = this.out;
        if (!out)
            return;
        out._e(err);
    };
    CombineListener.prototype._c = function () {
        var p = this.p;
        if (!p.out)
            return;
        if (--p.Nc === 0) {
            p.out._c();
        }
    };
    return CombineListener;
}());
exports.CombineListener = CombineListener;
var CombineProducer = (function () {
    function CombineProducer(insArr) {
        this.insArr = insArr;
        this.type = 'combine';
        this.out = null;
        this.ils = [];
        var n = this.Nc = this.Nn = insArr.length;
        var vals = this.vals = new Array(n);
        for (var i = 0; i < n; i++) {
            vals[i] = empty;
        }
    }
    CombineProducer.prototype.up = function (t, i) {
        var v = this.vals[i];
        var Nn = !this.Nn ? 0 : v === empty ? --this.Nn : this.Nn;
        this.vals[i] = t;
        return Nn === 0;
    };
    CombineProducer.prototype._start = function (out) {
        this.out = out;
        var s = this.insArr;
        var n = s.length;
        if (n === 0) {
            out._n([]);
            out._c();
        }
        else {
            for (var i = 0; i < n; i++) {
                s[i]._add(new CombineListener(i, out, this));
            }
        }
    };
    CombineProducer.prototype._stop = function () {
        var s = this.insArr;
        var n = this.Nc = this.Nn = s.length;
        var vals = this.vals = new Array(n);
        for (var i = 0; i < n; i++) {
            s[i]._remove(this.ils[i]);
            vals[i] = empty;
        }
        this.out = null;
        this.ils = [];
    };
    return CombineProducer;
}());
exports.CombineProducer = CombineProducer;
var FromArrayProducer = (function () {
    function FromArrayProducer(a) {
        this.a = a;
        this.type = 'fromArray';
    }
    FromArrayProducer.prototype._start = function (out) {
        var a = this.a;
        for (var i = 0, l = a.length; i < l; i++) {
            out._n(a[i]);
        }
        out._c();
    };
    FromArrayProducer.prototype._stop = function () {
    };
    return FromArrayProducer;
}());
exports.FromArrayProducer = FromArrayProducer;
var FromPromiseProducer = (function () {
    function FromPromiseProducer(p) {
        this.p = p;
        this.type = 'fromPromise';
        this.on = false;
    }
    FromPromiseProducer.prototype._start = function (out) {
        var prod = this;
        this.on = true;
        this.p.then(function (v) {
            if (prod.on) {
                out._n(v);
                out._c();
            }
        }, function (e) {
            out._e(e);
        }).then(null, function (err) {
            setTimeout(function () { throw err; });
        });
    };
    FromPromiseProducer.prototype._stop = function () {
        this.on = false;
    };
    return FromPromiseProducer;
}());
exports.FromPromiseProducer = FromPromiseProducer;
var PeriodicProducer = (function () {
    function PeriodicProducer(period) {
        this.period = period;
        this.type = 'periodic';
        this.intervalID = -1;
        this.i = 0;
    }
    PeriodicProducer.prototype._start = function (stream) {
        var self = this;
        function intervalHandler() { stream._n(self.i++); }
        this.intervalID = setInterval(intervalHandler, this.period);
    };
    PeriodicProducer.prototype._stop = function () {
        if (this.intervalID !== -1)
            clearInterval(this.intervalID);
        this.intervalID = -1;
        this.i = 0;
    };
    return PeriodicProducer;
}());
exports.PeriodicProducer = PeriodicProducer;
var DebugOperator = (function () {
    function DebugOperator(arg, ins) {
        this.ins = ins;
        this.type = 'debug';
        this.out = null;
        this.s = null; // spy
        this.l = null; // label
        if (typeof arg === 'string') {
            this.l = arg;
        }
        else {
            this.s = arg;
        }
    }
    DebugOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DebugOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    DebugOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        var s = this.s, l = this.l;
        if (s) {
            try {
                s(t);
            }
            catch (e) {
                u._e(e);
            }
        }
        else if (l) {
            console.log(l + ':', t);
        }
        else {
            console.log(t);
        }
        u._n(t);
    };
    DebugOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    DebugOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return DebugOperator;
}());
exports.DebugOperator = DebugOperator;
var DropOperator = (function () {
    function DropOperator(max, ins) {
        this.max = max;
        this.ins = ins;
        this.type = 'drop';
        this.out = null;
        this.dropped = 0;
    }
    DropOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    DropOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.dropped = 0;
    };
    DropOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        if (this.dropped++ >= this.max)
            u._n(t);
    };
    DropOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    DropOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return DropOperator;
}());
exports.DropOperator = DropOperator;
var OtherIL = (function () {
    function OtherIL(out, op) {
        this.out = out;
        this.op = op;
    }
    OtherIL.prototype._n = function (t) {
        this.op.end();
    };
    OtherIL.prototype._e = function (err) {
        this.out._e(err);
    };
    OtherIL.prototype._c = function () {
        this.op.end();
    };
    return OtherIL;
}());
var EndWhenOperator = (function () {
    function EndWhenOperator(o, // o = other
        ins) {
        this.o = o;
        this.ins = ins;
        this.type = 'endWhen';
        this.out = null;
        this.oil = exports.emptyIL; // oil = other InternalListener
    }
    EndWhenOperator.prototype._start = function (out) {
        this.out = out;
        this.o._add(this.oil = new OtherIL(out, this));
        this.ins._add(this);
    };
    EndWhenOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.o._remove(this.oil);
        this.out = null;
        this.oil = null;
    };
    EndWhenOperator.prototype.end = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    EndWhenOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    EndWhenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    EndWhenOperator.prototype._c = function () {
        this.end();
    };
    return EndWhenOperator;
}());
exports.EndWhenOperator = EndWhenOperator;
var FilterOperator = (function () {
    function FilterOperator(passes, ins) {
        this.passes = passes;
        this.ins = ins;
        this.type = 'filter';
        this.out = null;
    }
    FilterOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    FilterOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    FilterOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            if (this.passes(t))
                u._n(t);
        }
        catch (e) {
            u._e(e);
        }
    };
    FilterOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FilterOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return FilterOperator;
}());
exports.FilterOperator = FilterOperator;
var FlattenListener = (function () {
    function FlattenListener(out, op) {
        this.out = out;
        this.op = op;
    }
    FlattenListener.prototype._n = function (t) {
        this.out._n(t);
    };
    FlattenListener.prototype._e = function (err) {
        this.out._e(err);
    };
    FlattenListener.prototype._c = function () {
        this.op.inner = null;
        this.op.less();
    };
    return FlattenListener;
}());
var FlattenOperator = (function () {
    function FlattenOperator(ins) {
        this.ins = ins;
        this.type = 'flatten';
        this.inner = null; // Current inner Stream
        this.il = null; // Current inner InternalListener
        this.open = true;
        this.out = null;
    }
    FlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    FlattenOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.inner = null;
        this.il = null;
        this.open = true;
        this.out = null;
    };
    FlattenOperator.prototype.less = function () {
        var u = this.out;
        if (!u)
            return;
        if (!this.open && !this.inner)
            u._c();
    };
    FlattenOperator.prototype._n = function (s) {
        var u = this.out;
        if (!u)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner && il)
            inner._remove(il);
        (this.inner = s)._add(this.il = new FlattenListener(u, this));
    };
    FlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FlattenOperator.prototype._c = function () {
        this.open = false;
        this.less();
    };
    return FlattenOperator;
}());
exports.FlattenOperator = FlattenOperator;
var FoldOperator = (function () {
    function FoldOperator(f, seed, ins) {
        this.f = f;
        this.seed = seed;
        this.ins = ins;
        this.type = 'fold';
        this.out = null;
        this.acc = seed;
    }
    FoldOperator.prototype._start = function (out) {
        this.out = out;
        out._n(this.acc);
        this.ins._add(this);
    };
    FoldOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.acc = this.seed;
    };
    FoldOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            u._n(this.acc = this.f(this.acc, t));
        }
        catch (e) {
            u._e(e);
        }
    };
    FoldOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    FoldOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return FoldOperator;
}());
exports.FoldOperator = FoldOperator;
var LastOperator = (function () {
    function LastOperator(ins) {
        this.ins = ins;
        this.type = 'last';
        this.out = null;
        this.has = false;
        this.val = empty;
    }
    LastOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    LastOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.has = false;
        this.val = empty;
    };
    LastOperator.prototype._n = function (t) {
        this.has = true;
        this.val = t;
    };
    LastOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    LastOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        if (this.has) {
            u._n(this.val);
            u._c();
        }
        else {
            u._e('TODO show proper error');
        }
    };
    return LastOperator;
}());
exports.LastOperator = LastOperator;
var MapFlattenInner = (function () {
    function MapFlattenInner(out, op) {
        this.out = out;
        this.op = op;
    }
    MapFlattenInner.prototype._n = function (r) {
        this.out._n(r);
    };
    MapFlattenInner.prototype._e = function (err) {
        this.out._e(err);
    };
    MapFlattenInner.prototype._c = function () {
        this.op.inner = null;
        this.op.less();
    };
    return MapFlattenInner;
}());
var MapFlattenOperator = (function () {
    function MapFlattenOperator(mapOp) {
        this.mapOp = mapOp;
        this.inner = null; // Current inner Stream
        this.il = null; // Current inner InternalListener
        this.open = true;
        this.out = null;
        this.type = mapOp.type + "+flatten";
        this.ins = mapOp.ins;
    }
    MapFlattenOperator.prototype._start = function (out) {
        this.out = out;
        this.mapOp.ins._add(this);
    };
    MapFlattenOperator.prototype._stop = function () {
        this.mapOp.ins._remove(this);
        this.inner = null;
        this.il = null;
        this.open = true;
        this.out = null;
    };
    MapFlattenOperator.prototype.less = function () {
        if (!this.open && !this.inner) {
            var u = this.out;
            if (!u)
                return;
            u._c();
        }
    };
    MapFlattenOperator.prototype._n = function (v) {
        var u = this.out;
        if (!u)
            return;
        var _a = this, inner = _a.inner, il = _a.il;
        if (inner && il)
            inner._remove(il);
        try {
            (this.inner = this.mapOp.project(v))._add(this.il = new MapFlattenInner(u, this));
        }
        catch (e) {
            u._e(e);
        }
    };
    MapFlattenOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MapFlattenOperator.prototype._c = function () {
        this.open = false;
        this.less();
    };
    return MapFlattenOperator;
}());
exports.MapFlattenOperator = MapFlattenOperator;
var MapOperator = (function () {
    function MapOperator(project, ins) {
        this.project = project;
        this.ins = ins;
        this.type = 'map';
        this.out = null;
    }
    MapOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    MapOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    MapOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        try {
            u._n(this.project(t));
        }
        catch (e) {
            u._e(e);
        }
    };
    MapOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    MapOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return MapOperator;
}());
exports.MapOperator = MapOperator;
var FilterMapOperator = (function (_super) {
    __extends(FilterMapOperator, _super);
    function FilterMapOperator(passes, project, ins) {
        _super.call(this, project, ins);
        this.passes = passes;
        this.type = 'filter+map';
    }
    FilterMapOperator.prototype._n = function (v) {
        if (this.passes(v)) {
            _super.prototype._n.call(this, v);
        }
        ;
    };
    return FilterMapOperator;
}(MapOperator));
exports.FilterMapOperator = FilterMapOperator;
var ReplaceErrorOperator = (function () {
    function ReplaceErrorOperator(fn, ins) {
        this.fn = fn;
        this.ins = ins;
        this.type = 'replaceError';
        this.out = empty;
    }
    ReplaceErrorOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    ReplaceErrorOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
    };
    ReplaceErrorOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        u._n(t);
    };
    ReplaceErrorOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        try {
            this.ins._remove(this);
            (this.ins = this.fn(err))._add(this);
        }
        catch (e) {
            u._e(e);
        }
    };
    ReplaceErrorOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return ReplaceErrorOperator;
}());
exports.ReplaceErrorOperator = ReplaceErrorOperator;
var StartWithOperator = (function () {
    function StartWithOperator(ins, value) {
        this.ins = ins;
        this.value = value;
        this.type = 'startWith';
        this.out = exports.emptyIL;
    }
    StartWithOperator.prototype._start = function (out) {
        this.out = out;
        this.out._n(this.value);
        this.ins._add(out);
    };
    StartWithOperator.prototype._stop = function () {
        this.ins._remove(this.out);
        this.out = null;
    };
    return StartWithOperator;
}());
exports.StartWithOperator = StartWithOperator;
var TakeOperator = (function () {
    function TakeOperator(max, ins) {
        this.max = max;
        this.ins = ins;
        this.type = 'take';
        this.out = null;
        this.taken = 0;
    }
    TakeOperator.prototype._start = function (out) {
        this.out = out;
        this.ins._add(this);
    };
    TakeOperator.prototype._stop = function () {
        this.ins._remove(this);
        this.out = null;
        this.taken = 0;
    };
    TakeOperator.prototype._n = function (t) {
        var u = this.out;
        if (!u)
            return;
        if (this.taken++ < this.max - 1) {
            u._n(t);
        }
        else {
            u._n(t);
            u._c();
        }
    };
    TakeOperator.prototype._e = function (err) {
        var u = this.out;
        if (!u)
            return;
        u._e(err);
    };
    TakeOperator.prototype._c = function () {
        var u = this.out;
        if (!u)
            return;
        u._c();
    };
    return TakeOperator;
}());
exports.TakeOperator = TakeOperator;
var Stream = (function () {
    function Stream(producer) {
        this._stopID = empty;
        this._prod = producer;
        this._ils = [];
        this._target = null;
        this._err = null;
    }
    Stream.prototype._n = function (t) {
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._n(t);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._n(t);
        }
    };
    Stream.prototype._e = function (err) {
        if (this._err)
            return;
        this._err = err;
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._e(err);
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._e(err);
        }
        this._x();
    };
    Stream.prototype._c = function () {
        var a = this._ils;
        var L = a.length;
        if (L == 1)
            a[0]._c();
        else {
            var b = copy(a);
            for (var i = 0; i < L; i++)
                b[i]._c();
        }
        this._x();
    };
    Stream.prototype._x = function () {
        if (this._ils.length === 0)
            return;
        if (this._prod)
            this._prod._stop();
        this._err = null;
        this._ils = [];
    };
    /**
     * Adds a Listener to the Stream.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.addListener = function (listener) {
        if (typeof listener.next !== 'function'
            || typeof listener.error !== 'function'
            || typeof listener.complete !== 'function') {
            throw new Error('stream.addListener() requires all three next, error, ' +
                'and complete functions.');
        }
        listener._n = listener.next;
        listener._e = listener.error;
        listener._c = listener.complete;
        this._add(listener);
    };
    /**
     * Removes a Listener from the Stream, assuming the Listener was added to it.
     *
     * @param {Listener<T>} listener
     */
    Stream.prototype.removeListener = function (listener) {
        this._remove(listener);
    };
    Stream.prototype._add = function (il) {
        var ta = this._target;
        if (ta)
            return ta._add(il);
        var a = this._ils;
        a.push(il);
        if (a.length === 1) {
            if (this._stopID !== empty) {
                clearTimeout(this._stopID);
                this._stopID = empty;
            }
            var p = this._prod;
            if (p)
                p._start(this);
        }
    };
    Stream.prototype._remove = function (il) {
        var ta = this._target;
        if (ta)
            return ta._remove(il);
        var a = this._ils;
        var i = a.indexOf(il);
        if (i > -1) {
            a.splice(i, 1);
            var p_1 = this._prod;
            if (p_1 && a.length <= 0) {
                this._err = null;
                this._stopID = setTimeout(function () { return p_1._stop(); });
            }
            else if (a.length === 1) {
                this._pruneCycles();
            }
        }
    };
    // If all paths stemming from `this` stream eventually end at `this`
    // stream, then we remove the single listener of `this` stream, to
    // force it to end its execution and dispose resources. This method
    // assumes as a precondition that this._ils has just one listener.
    Stream.prototype._pruneCycles = function () {
        if (this._onlyReachesThis(this)) {
            this._remove(this._ils[0]);
        }
    };
    // Checks whether *all* paths starting from `x` will eventually end at
    // `this` stream, on the stream graph, following edges A->B where B is
    // a listener of A.
    Stream.prototype._onlyReachesThis = function (x) {
        if (x.out === this) {
            return true;
        }
        else if (x.out) {
            return this._onlyReachesThis(x.out);
        }
        else if (x._ils) {
            for (var i = 0, N = x._ils.length; i < N; i++) {
                if (!this._onlyReachesThis(x._ils[i]))
                    return false;
            }
            return true;
        }
        else {
            return false;
        }
    };
    Stream.prototype.ctor = function () {
        return this instanceof MemoryStream ? MemoryStream : Stream;
    };
    /**
     * Creates a new Stream given a Producer.
     *
     * @factory true
     * @param {Producer} producer An optional Producer that dictates how to
     * start, generate events, and stop the Stream.
     * @return {Stream}
     */
    Stream.create = function (producer) {
        if (producer) {
            if (typeof producer.start !== 'function'
                || typeof producer.stop !== 'function') {
                throw new Error('producer requires both start and stop functions');
            }
            internalizeProducer(producer); // mutates the input
        }
        return new Stream(producer);
    };
    /**
     * Creates a new MemoryStream given a Producer.
     *
     * @factory true
     * @param {Producer} producer An optional Producer that dictates how to
     * start, generate events, and stop the Stream.
     * @return {MemoryStream}
     */
    Stream.createWithMemory = function (producer) {
        if (producer) {
            internalizeProducer(producer); // mutates the input
        }
        return new MemoryStream(producer);
    };
    /**
     * Creates a Stream that does nothing when started. It never emits any event.
     *
     * Marble diagram:
     *
     * ```text
     *          never
     * -----------------------
     * ```
     *
     * @factory true
     * @return {Stream}
     */
    Stream.never = function () {
        return new Stream({ _start: noop, _stop: noop });
    };
    /**
     * Creates a Stream that immediately emits the "complete" notification when
     * started, and that's it.
     *
     * Marble diagram:
     *
     * ```text
     * empty
     * -|
     * ```
     *
     * @factory true
     * @return {Stream}
     */
    Stream.empty = function () {
        return new Stream({
            _start: function (il) { il._c(); },
            _stop: noop,
        });
    };
    /**
     * Creates a Stream that immediately emits an "error" notification with the
     * value you passed as the `error` argument when the stream starts, and that's
     * it.
     *
     * Marble diagram:
     *
     * ```text
     * throw(X)
     * -X
     * ```
     *
     * @factory true
     * @param error The error event to emit on the created stream.
     * @return {Stream}
     */
    Stream.throw = function (error) {
        return new Stream({
            _start: function (il) { il._e(error); },
            _stop: noop,
        });
    };
    /**
     * Creates a Stream that immediately emits the arguments that you give to
     * *of*, then completes.
     *
     * Marble diagram:
     *
     * ```text
     * of(1,2,3)
     * 123|
     * ```
     *
     * @factory true
     * @param a The first value you want to emit as an event on the stream.
     * @param b The second value you want to emit as an event on the stream. One
     * or more of these values may be given as arguments.
     * @return {Stream}
     */
    Stream.of = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i - 0] = arguments[_i];
        }
        return Stream.fromArray(items);
    };
    /**
     * Converts an array to a stream. The returned stream will emit synchronously
     * all the items in the array, and then complete.
     *
     * Marble diagram:
     *
     * ```text
     * fromArray([1,2,3])
     * 123|
     * ```
     *
     * @factory true
     * @param {Array} array The array to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromArray = function (array) {
        return new Stream(new FromArrayProducer(array));
    };
    /**
     * Converts a promise to a stream. The returned stream will emit the resolved
     * value of the promise, and then complete. However, if the promise is
     * rejected, the stream will emit the corresponding error.
     *
     * Marble diagram:
     *
     * ```text
     * fromPromise( ----42 )
     * -----------------42|
     * ```
     *
     * @factory true
     * @param {Promise} promise The promise to be converted as a stream.
     * @return {Stream}
     */
    Stream.fromPromise = function (promise) {
        return new Stream(new FromPromiseProducer(promise));
    };
    /**
     * Creates a stream that periodically emits incremental numbers, every
     * `period` milliseconds.
     *
     * Marble diagram:
     *
     * ```text
     *     periodic(1000)
     * ---0---1---2---3---4---...
     * ```
     *
     * @factory true
     * @param {number} period The interval in milliseconds to use as a rate of
     * emission.
     * @return {Stream}
     */
    Stream.periodic = function (period) {
        return new Stream(new PeriodicProducer(period));
    };
    /**
     * Blends multiple streams together, emitting events from all of them
     * concurrently.
     *
     * *merge* takes multiple streams as arguments, and creates a stream that
     * behaves like each of the argument streams, in parallel.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3--------4---
     * ----a-----b----c---d------
     *            merge
     * --1-a--2--b--3-c---d--4---
     * ```
     *
     * @factory true
     * @param {Stream} stream1 A stream to merge together with other streams.
     * @param {Stream} stream2 A stream to merge together with other streams. Two
     * or more streams may be given as arguments.
     * @return {Stream}
     */
    Stream.merge = function () {
        var streams = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            streams[_i - 0] = arguments[_i];
        }
        return new Stream(new MergeProducer(streams));
    };
    Stream.prototype._map = function (project) {
        var p = this._prod;
        var ctor = this.ctor();
        if (p instanceof FilterOperator) {
            return new ctor(new FilterMapOperator(p.passes, project, p.ins));
        }
        if (p instanceof FilterMapOperator) {
            return new ctor(new FilterMapOperator(p.passes, compose2(project, p.project), p.ins));
        }
        if (p instanceof MapOperator) {
            return new ctor(new MapOperator(compose2(project, p.project), p.ins));
        }
        return new ctor(new MapOperator(project, this));
    };
    /**
     * Transforms each event from the input Stream through a `project` function,
     * to get a Stream that emits those transformed events.
     *
     * Marble diagram:
     *
     * ```text
     * --1---3--5-----7------
     *    map(i => i * 10)
     * --10--30-50----70-----
     * ```
     *
     * @param {Function} project A function of type `(t: T) => U` that takes event
     * `t` of type `T` from the input Stream and produces an event of type `U`, to
     * be emitted on the output Stream.
     * @return {Stream}
     */
    Stream.prototype.map = function (project) {
        return this._map(project);
    };
    /**
     * It's like `map`, but transforms each input event to always the same
     * constant value on the output Stream.
     *
     * Marble diagram:
     *
     * ```text
     * --1---3--5-----7-----
     *       mapTo(10)
     * --10--10-10----10----
     * ```
     *
     * @param projectedValue A value to emit on the output Stream whenever the
     * input Stream emits any value.
     * @return {Stream}
     */
    Stream.prototype.mapTo = function (projectedValue) {
        var s = this.map(function () { return projectedValue; });
        var op = s._prod;
        op.type = op.type.replace('map', 'mapTo');
        return s;
    };
    /**
     * Only allows events that pass the test given by the `passes` argument.
     *
     * Each event from the input stream is given to the `passes` function. If the
     * function returns `true`, the event is forwarded to the output stream,
     * otherwise it is ignored and not forwarded.
     *
     * Marble diagram:
     *
     * ```text
     * --1---2--3-----4-----5---6--7-8--
     *     filter(i => i % 2 === 0)
     * ------2--------4---------6----8--
     * ```
     *
     * @param {Function} passes A function of type `(t: T) +> boolean` that takes
     * an event from the input stream and checks if it passes, by returning a
     * boolean.
     * @return {Stream}
     */
    Stream.prototype.filter = function (passes) {
        var p = this._prod;
        if (p instanceof FilterOperator) {
            return new Stream(new FilterOperator(and(passes, p.passes), p.ins));
        }
        return new Stream(new FilterOperator(passes, this));
    };
    /**
     * Lets the first `amount` many events from the input stream pass to the
     * output stream, then makes the output stream complete.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c----d---e--
     *    take(3)
     * --a---b--c|
     * ```
     *
     * @param {number} amount How many events to allow from the input stream
     * before completing the output stream.
     * @return {Stream}
     */
    Stream.prototype.take = function (amount) {
        return new (this.ctor())(new TakeOperator(amount, this));
    };
    /**
     * Ignores the first `amount` many events from the input stream, and then
     * after that starts forwarding events from the input stream to the output
     * stream.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c----d---e--
     *       drop(3)
     * --------------d---e--
     * ```
     *
     * @param {number} amount How many events to ignore from the input stream
     * before forwarding all events from the input stream to the output stream.
     * @return {Stream}
     */
    Stream.prototype.drop = function (amount) {
        return new Stream(new DropOperator(amount, this));
    };
    /**
     * When the input stream completes, the output stream will emit the last event
     * emitted by the input stream, and then will also complete.
     *
     * Marble diagram:
     *
     * ```text
     * --a---b--c--d----|
     *       last()
     * -----------------d|
     * ```
     *
     * @return {Stream}
     */
    Stream.prototype.last = function () {
        return new Stream(new LastOperator(this));
    };
    /**
     * Prepends the given `initial` value to the sequence of events emitted by the
     * input stream. The returned stream is a MemoryStream, which means it is
     * already `remember()`'d.
     *
     * Marble diagram:
     *
     * ```text
     * ---1---2-----3---
     *   startWith(0)
     * 0--1---2-----3---
     * ```
     *
     * @param initial The value or event to prepend.
     * @return {MemoryStream}
     */
    Stream.prototype.startWith = function (initial) {
        return new MemoryStream(new StartWithOperator(this, initial));
    };
    /**
     * Uses another stream to determine when to complete the current stream.
     *
     * When the given `other` stream emits an event or completes, the output
     * stream will complete. Before that happens, the output stream will behaves
     * like the input stream.
     *
     * Marble diagram:
     *
     * ```text
     * ---1---2-----3--4----5----6---
     *   endWhen( --------a--b--| )
     * ---1---2-----3--4--|
     * ```
     *
     * @param other Some other stream that is used to know when should the output
     * stream of this operator complete.
     * @return {Stream}
     */
    Stream.prototype.endWhen = function (other) {
        return new (this.ctor())(new EndWhenOperator(other, this));
    };
    /**
     * "Folds" the stream onto itself.
     *
     * Combines events from the past throughout
     * the entire execution of the input stream, allowing you to accumulate them
     * together. It's essentially like `Array.prototype.reduce`. The returned
     * stream is a MemoryStream, which means it is already `remember()`'d.
     *
     * The output stream starts by emitting the `seed` which you give as argument.
     * Then, when an event happens on the input stream, it is combined with that
     * seed value through the `accumulate` function, and the output value is
     * emitted on the output stream. `fold` remembers that output value as `acc`
     * ("accumulator"), and then when a new input event `t` happens, `acc` will be
     * combined with that to produce the new `acc` and so forth.
     *
     * Marble diagram:
     *
     * ```text
     * ------1-----1--2----1----1------
     *   fold((acc, x) => acc + x, 3)
     * 3-----4-----5--7----8----9------
     * ```
     *
     * @param {Function} accumulate A function of type `(acc: R, t: T) => R` that
     * takes the previous accumulated value `acc` and the incoming event from the
     * input stream and produces the new accumulated value.
     * @param seed The initial accumulated value, of type `R`.
     * @return {MemoryStream}
     */
    Stream.prototype.fold = function (accumulate, seed) {
        return new MemoryStream(new FoldOperator(accumulate, seed, this));
    };
    /**
     * Replaces an error with another stream.
     *
     * When (and if) an error happens on the input stream, instead of forwarding
     * that error to the output stream, *replaceError* will call the `replace`
     * function which returns the stream that the output stream will replicate.
     * And, in case that new stream also emits an error, `replace` will be called
     * again to get another stream to start replicating.
     *
     * Marble diagram:
     *
     * ```text
     * --1---2-----3--4-----X
     *   replaceError( () => --10--| )
     * --1---2-----3--4--------10--|
     * ```
     *
     * @param {Function} replace A function of type `(err) => Stream` that takes
     * the error that occurred on the input stream or on the previous replacement
     * stream and returns a new stream. The output stream will behave like the
     * stream that this function returns.
     * @return {Stream}
     */
    Stream.prototype.replaceError = function (replace) {
        return new (this.ctor())(new ReplaceErrorOperator(replace, this));
    };
    /**
     * Flattens a "stream of streams", handling only one nested stream at a time
     * (no concurrency).
     *
     * If the input stream is a stream that emits streams, then this operator will
     * return an output stream which is a flat stream: emits regular events. The
     * flattening happens without concurrency. It works like this: when the input
     * stream emits a nested stream, *flatten* will start imitating that nested
     * one. However, as soon as the next nested stream is emitted on the input
     * stream, *flatten* will forget the previous nested one it was imitating, and
     * will start imitating the new nested one.
     *
     * Marble diagram:
     *
     * ```text
     * --+--------+---------------
     *   \        \
     *    \       ----1----2---3--
     *    --a--b----c----d--------
     *           flatten
     * -----a--b------1----2---3--
     * ```
     *
     * @return {Stream}
     */
    Stream.prototype.flatten = function () {
        var p = this._prod;
        return new Stream(p instanceof MapOperator && !(p instanceof FilterMapOperator) ?
            new MapFlattenOperator(p) :
            new FlattenOperator(this));
    };
    /**
     * Passes the input stream to a custom operator, to produce an output stream.
     *
     * *compose* is a handy way of using an existing function in a chained style.
     * Instead of writing `outStream = f(inStream)` you can write
     * `outStream = inStream.compose(f)`.
     *
     * @param {function} operator A function that takes a stream as input and
     * returns a stream as well.
     * @return {Stream}
     */
    Stream.prototype.compose = function (operator) {
        return operator(this);
    };
    /**
     * Returns an output stream that behaves like the input stream, but also
     * remembers the most recent event that happens on the input stream, so that a
     * newly added listener will immediately receive that memorised event.
     *
     * @return {MemoryStream}
     */
    Stream.prototype.remember = function () {
        var _this = this;
        return new MemoryStream({
            _start: function (il) {
                var p = _this._prod;
                if (p)
                    p._start(il);
            },
            _stop: function () {
                var p = _this._prod;
                if (p)
                    p._stop();
            },
        });
    };
    /**
     * Returns an output stream that identically behaves like the input stream,
     * but also runs a `spy` function fo each event, to help you debug your app.
     *
     * *debug* takes a `spy` function as argument, and runs that for each event
     * happening on the input stream. If you don't provide the `spy` argument,
     * then *debug* will just `console.log` each event. This helps you to
     * understand the flow of events through some operator chain.
     *
     * Please note that if the output stream has no listeners, then it will not
     * start, which means `spy` will never run because no actual event happens in
     * that case.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3-----4--
     *         debug
     * --1----2-----3-----4--
     * ```
     *
     * @param {function} labelOrSpy A string to use as the label when printing
     * debug information on the console, or a 'spy' function that takes an event
     * as argument, and does not need to return anything.
     * @return {Stream}
     */
    Stream.prototype.debug = function (labelOrSpy) {
        return new (this.ctor())(new DebugOperator(labelOrSpy, this));
    };
    /**
     * *imitate* changes this current Stream to emit the same events that the
     * `other` given Stream does. This method returns nothing.
     *
     * This method exists to allow one thing: **circular dependency of streams**.
     * For instance, let's imagine that for some reason you need to create a
     * circular dependency where stream `first$` depends on stream `second$`
     * which in turn depends on `first$`:
     *
     * <!-- skip-example -->
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var first$ = second$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * ```
     *
     * However, that is invalid JavaScript, because `second$` is undefined
     * on the first line. This is how *imitate* can help solve it:
     *
     * ```js
     * import delay from 'xstream/extra/delay'
     *
     * var secondProxy$ = xs.create();
     * var first$ = secondProxy$.map(x => x * 10).take(3);
     * var second$ = first$.map(x => x + 1).startWith(1).compose(delay(100));
     * secondProxy$.imitate(second$);
     * ```
     *
     * We create `secondProxy$` before the others, so it can be used in the
     * declaration of `first$`. Then, after both `first$` and `second$` are
     * defined, we hook `secondProxy$` with `second$` with `imitate()` to tell
     * that they are "the same". `imitate` will not trigger the start of any
     * stream, it just binds `secondProxy$` and `second$` together.
     *
     * The following is an example where `imitate()` is important in Cycle.js
     * applications. A parent component contains some child components. A child
     * has an action stream which is given to the parent to define its state:
     *
     * <!-- skip-example -->
     * ```js
     * const childActionProxy$ = xs.create();
     * const parent = Parent({...sources, childAction$: childActionProxy$});
     * const childAction$ = parent.state$.map(s => s.child.action$).flatten();
     * childActionProxy$.imitate(childAction$);
     * ```
     *
     * Note, though, that **`imitate()` does not support MemoryStreams**. If we
     * would attempt to imitate a MemoryStream in a circular dependency, we would
     * either get a race condition (where the symptom would be "nothing happens")
     * or an infinite cyclic emission of values. It's useful to think about
     * MemoryStreams as cells in a spreadsheet. It doesn't make any sense to
     * define a spreadsheet cell `A1` with a formula that depends on `B1` and
     * cell `B1` defined with a formula that depends on `A1`.
     *
     * If you find yourself wanting to use `imitate()` with a
     * MemoryStream, you should rework your code around `imitate()` to use a
     * Stream instead. Look for the stream in the circular dependency that
     * represents an event stream, and that would be a candidate for creating a
     * proxy Stream which then imitates the target Stream.
     *
     * @param {Stream} target The other stream to imitate on the current one. Must
     * not be a MemoryStream.
     */
    Stream.prototype.imitate = function (target) {
        if (target instanceof MemoryStream) {
            throw new Error('A MemoryStream was given to imitate(), but it only ' +
                'supports a Stream. Read more about this restriction here: ' +
                'https://github.com/staltz/xstream#faq');
        }
        this._target = target;
    };
    /**
     * Forces the Stream to emit the given value to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     *
     * @param value The "next" value you want to broadcast to all listeners of
     * this Stream.
     */
    Stream.prototype.shamefullySendNext = function (value) {
        this._n(value);
    };
    /**
     * Forces the Stream to emit the given error to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     *
     * @param {any} error The error you want to broadcast to all the listeners of
     * this Stream.
     */
    Stream.prototype.shamefullySendError = function (error) {
        this._e(error);
    };
    /**
     * Forces the Stream to emit the "completed" event to its listeners.
     *
     * As the name indicates, if you use this, you are most likely doing something
     * The Wrong Way. Please try to understand the reactive way before using this
     * method. Use it only when you know what you are doing.
     */
    Stream.prototype.shamefullySendComplete = function () {
        this._c();
    };
    /**
     * Combines multiple input streams together to return a stream whose events
     * are arrays that collect the latest events from each input stream.
     *
     * *combine* internally remembers the most recent event from each of the input
     * streams. When any of the input streams emits an event, that event together
     * with all the other saved events are combined into an array. That array will
     * be emitted on the output stream. It's essentially a way of joining together
     * the events from multiple streams.
     *
     * Marble diagram:
     *
     * ```text
     * --1----2-----3--------4---
     * ----a-----b-----c--d------
     *          combine
     * ----1a-2a-2b-3b-3c-3d-4d--
     * ```
     *
     * @factory true
     * @param {Stream} stream1 A stream to combine together with other streams.
     * @param {Stream} stream2 A stream to combine together with other streams.
     * Multiple streams, not just two, may be given as arguments.
     * @return {Stream}
     */
    Stream.combine = function combine() {
        var streams = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            streams[_i - 0] = arguments[_i];
        }
        return new Stream(new CombineProducer(streams));
    };
    return Stream;
}());
exports.Stream = Stream;
var MemoryStream = (function (_super) {
    __extends(MemoryStream, _super);
    function MemoryStream(producer) {
        _super.call(this, producer);
        this._has = false;
    }
    MemoryStream.prototype._n = function (x) {
        this._v = x;
        this._has = true;
        _super.prototype._n.call(this, x);
    };
    MemoryStream.prototype._add = function (il) {
        if (this._has) {
            il._n(this._v);
        }
        _super.prototype._add.call(this, il);
    };
    MemoryStream.prototype._x = function () {
        this._has = false;
        _super.prototype._x.call(this);
    };
    MemoryStream.prototype.map = function (project) {
        return this._map(project);
    };
    MemoryStream.prototype.mapTo = function (projectedValue) {
        return _super.prototype.mapTo.call(this, projectedValue);
    };
    MemoryStream.prototype.take = function (amount) {
        return _super.prototype.take.call(this, amount);
    };
    MemoryStream.prototype.endWhen = function (other) {
        return _super.prototype.endWhen.call(this, other);
    };
    MemoryStream.prototype.replaceError = function (replace) {
        return _super.prototype.replaceError.call(this, replace);
    };
    MemoryStream.prototype.debug = function (labelOrSpy) {
        return _super.prototype.debug.call(this, labelOrSpy);
    };
    return MemoryStream;
}(Stream));
exports.MemoryStream = MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Stream;

},{}],98:[function(require,module,exports){
"use strict";
var core_1 = require('./core');
exports.Stream = core_1.Stream;
exports.MemoryStream = core_1.MemoryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = core_1.Stream;

},{"./core":97}],99:[function(require,module,exports){
'use strict';

var _xstreamRun = require('@cycle/xstream-run');

var _xstreamRun2 = _interopRequireDefault(_xstreamRun);

var _dom = require('@cycle/dom');

var _ = require('../../../');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }


var template = "<div>\n  <label>Name:</label>\n  <input class=\"myinput\" type=\"text\">\n  <hr>\n  <h1>Hey <span id=\"output\">output here</span>!</h1>\n</div>\n";

function main(sources) {
  return {
    DOM: sources.DOM.select('.myinput').events('input').map(function (ev) {
      return ev.target.value;
    }).startWith('').map(function (name) {
      return (0, _2.default)(template, { '#output': name });
    }
    /*div([
      label('Name:'),
      input('.myinput', {attrs: {type: 'text'}}),
      hr(),
      h1(`Hello ${name}`)
    ])*/
    )
  };
}

_xstreamRun2.default.run(main, {
  DOM: (0, _dom.makeDOMDriver)('#main-container')
});

},{"../../../":100,"@cycle/dom":10,"@cycle/xstream-run":68}],100:[function(require,module,exports){
var vTSel = require('snabbdom-selector').default;
var vToHTML = require('snabbdom-to-html');
var hToVDOM = require('snabbdom-virtualize/strings').default;
//var sh = require('snabbdom/h')
var vNode = require('snabbdom/vnode');
var vText = function (text) {
  return vNode(undefined, undefined, undefined, unescape(text));
};

module.exports = function vDT(templates, contentvars) {
  var vt;
  // if arguments are contained in a single object, pull them out
  if ('object' === typeof templates && !Array.isArray(templates) && undefined === contentvars) {
    contentvars = templates[Object.keys(templates)[1]];
    templates = templates[Object.keys(templates)[0]];
  }
  contentvars = contentvars || {};
  if (Array.isArray(templates)) {
    if (1 < templates.length) {
      var start = templates.reverse().shift();
      start = Array.isArray(start) ? vNode('div', {}, start) : start; // wrap div around array of elems
      vt = templates.reduce(function (prev, next) {
        var ret = hToVDOM(next);
        ret = Array.isArray(ret) ? vNode('div', {}, ret) : ret; // wrap div around array of elems
        var tar = vTSel('.template', ret);
        if (tar.length) {
          tar[0].children = prev && prev.children || undefined;
        } else {
          console.log('Template selector not found.');
        }
        return ret;
      }, hToVDOM(start));
      vt = hToVDOM(vToHTML(vt)); // how to clone?
    } else {
        vt = hToVDOM(templates[0]);
        vt = Array.isArray(vt) ? vNode('div', {}, vt) : vt; // wrap div around array of elems
      }
  } else if ('object' === typeof templates) {
      vt = hToVDOM(vToHTML(templates)); // fixes glitch copying templates
    } else {
        vt = hToVDOM(templates);
        vt = Array.isArray(vt) ? vNode('div', {}, vt) : vt; // wrap div around array of elems
      }
  if (contentvars.sel && contentvars.data) {
    // vtree
    var tar = vTSel('.template', vt);
    if (tar.length) {
      tar[0].children = contentvars && [contentvars] || undefined;
    } else {
      console.log('Template selector not found.');
    }
  } else {
    Object.keys(contentvars).forEach(function (sel) {
      var value = contentvars[sel];
      var target = vTSel(sel, vt);
      if (target.length) {
        target = target[0];
        if ('string' === typeof value || 'number' === typeof value) {
          target.children = [vText(value)];
        } else if ('object' === typeof value) {
          Object.keys(value).forEach(function (prop) {
            var targetprops = target.data.attrs = target.data.attrs || {};
            var valprop = value[prop];
            if ('_html' === prop) {
              target.children = [vText(valprop)];
            } else if ('_append' === prop) {
              target.children.push(vText(valprop));
            } else if ('_prepend' === prop) {
              target.children.unshift(vText(valprop));
            } else if (/^_map/.test(prop) && 'object' === typeof valprop && null !== valprop) {
              Object.keys(valprop).forEach(function (mapkey) {
                var subtmpl = hToVDOM(vToHTML(vTSel(mapkey, target)[0])); // how else to clone?
                if ('_map' === prop) {
                  target.children = [];
                }
                valprop[mapkey].forEach(function (cvars) {
                  var mapd;
                  if ('string' === typeof cvars) {
                    subtmpl.children = [vText(cvars)];
                    mapd = hToVDOM(vToHTML(subtmpl)); // how to clone?
                  } else if ('object' === typeof cvars) {
                      mapd = vDT(subtmpl, cvars);
                    }
                  switch (prop) {
                    case '_mapprepend':
                      target.children.unshift(mapd);break;
                    default:
                      target.children.push(mapd);break;
                  }
                });
              });
            } else {
              var cur = targetprops[prop] || '';
              if (valprop && 'object' === typeof valprop && null !== valprop) {
                if (valprop.append) {
                  cur += valprop.append;
                } else if (valprop.prepend) {
                  cur = valprop.prepend + cur;
                }
              } else {
                cur = valprop;
              }
              targetprops[prop] = cur;
            }
          });
        } else if ('function' === typeof value) {
          target.children[0].text = value(target.children[0].text);
        }
      } // end if target
      else {
          console.log('Selector not found. ', sel);
        }
    });
  }
  return vt;
};

},{"snabbdom-selector":104,"snabbdom-to-html":112,"snabbdom-virtualize/strings":145,"snabbdom/vnode":148}],101:[function(require,module,exports){
var attrRE = /([\w-]+)|=|(['"])([.\s\S]*?)\2/g;
var voidElements = require('void-elements');

module.exports = function (tag) {
    var i = 0;
    var key;
    var expectingValueAfterEquals = true;
    var res = {
        type: 'tag',
        name: '',
        voidElement: false,
        attrs: {},
        children: []
    };

    tag.replace(attrRE, function (match) {
        if (match === '=') {
            expectingValueAfterEquals = true;
            i++;
            return;
        }

        if (!expectingValueAfterEquals) {
            if (key) {
                res.attrs[key] = key; // boolean attribute
            }
            key=match;
        } else {
            if (i === 0) {
                if (voidElements[match] || tag.charAt(tag.length - 2) === '/') {
                    res.voidElement = true;
                }
                res.name = match;
            } else {
                res.attrs[key] = match.replace(/^['"]|['"]$/g, '');
                key=undefined;
            }
        }
        i++;
        expectingValueAfterEquals = false;
    });

    return res;
};

},{"void-elements":149}],102:[function(require,module,exports){
/*jshint -W030 */
var tagRE = /(?:<!--[\S\s]*?-->|<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>)/g;
var parseTag = require('./parse-tag');
// re-used obj for quick lookups of components
var empty = Object.create ? Object.create(null) : {};
// common logic for pushing a child node onto a list
function pushTextNode(list, html, level, start, ignoreWhitespace) {
    // calculate correct end of the content slice in case there's
    // no tag after the text node.
    var end = html.indexOf('<', start);
    var content = html.slice(start, end === -1 ? undefined : end);
    // if a node is nothing but whitespace, collapse it as the spec states:
    // https://www.w3.org/TR/html4/struct/text.html#h-9.1
    if (/^\s*$/.test(content)) {
        content = ' ';
    }
    // don't add whitespace-only text nodes if they would be trailing text nodes
    // or if they would be leading whitespace-only text nodes:
    //  * end > -1 indicates this is not a trailing text node
    //  * leading node is when level is -1 and list has length 0
    if ((!ignoreWhitespace && end > -1 && level + list.length >= 0) || content !== ' ') {
        list.push({
            type: 'text',
            content: content
        });
    }
}

module.exports = function parse(html, options) {
    options || (options = {});
    options.components || (options.components = empty);
    var result = [];
    var current;
    var level = -1;
    var arr = [];
    var byTag = {};
    var inComponent = false;

    html.replace(tagRE, function (tag, index) {
        if (inComponent) {
            if (tag !== ('</' + current.name + '>')) {
                return;
            } else {
                inComponent = false;
            }
        }

        var isOpen = tag.charAt(1) !== '/';
        var isComment = tag.indexOf('<!--') === 0;
        var start = index + tag.length;
        var nextChar = html.charAt(start);
        var parent;

        if (isOpen && !isComment) {
            level++;

            current = parseTag(tag);
            if (current.type === 'tag' && options.components[current.name]) {
                current.type = 'component';
                inComponent = true;
            }

            if (!current.voidElement && !inComponent && nextChar && nextChar !== '<') {
                pushTextNode(current.children, html, level, start, options.ignoreWhitespace);
            }

            byTag[current.tagName] = current;

            // if we're at root, push new base node
            if (level === 0) {
                result.push(current);
            }

            parent = arr[level - 1];

            if (parent) {
                parent.children.push(current);
            }

            arr[level] = current;
        }

        if (isComment || !isOpen || current.voidElement) {
            if (!isComment) {
                level--;
            }
            if (!inComponent && nextChar !== '<' && nextChar) {
                // trailing text node
                // if we're at the root, push a base text node. otherwise add as
                // a child to the current node.
                parent = level === -1 ? result : arr[level].children;
                pushTextNode(parent, html, level, start, options.ignoreWhitespace);
            }
        }
    });

    // If the "html" passed isn't actually html, add it as a text node.
    if (!result.length && html.length) {
        pushTextNode(result, html, 0, 0, options.ignoreWhitespace);
    }

    return result;
};

},{"./parse-tag":101}],103:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = classNameFromVNode;

var _selectorParser2 = require('./selectorParser');

var _selectorParser3 = _interopRequireDefault(_selectorParser2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function classNameFromVNode(vNode) {
  var _selectorParser = (0, _selectorParser3.default)(vNode.sel);

  var cn = _selectorParser.className;


  if (!vNode.data) {
    return cn;
  }

  var _vNode$data = vNode.data;
  var dataClass = _vNode$data.class;
  var props = _vNode$data.props;


  if (dataClass) {
    var c = Object.keys(vNode.data.class).filter(function (cl) {
      return vNode.data.class[cl];
    });
    cn += ' ' + c.join(' ');
  }

  if (props && props.className) {
    cn += ' ' + props.className;
  }

  return cn.trim();
}
},{"./selectorParser":106}],104:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _language = require('./language');

var _language2 = _interopRequireDefault(_language);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function traverse(vNode, fn) {
  fn(vNode);
  if (vNode.children) {
    vNode.children.forEach(function (child) {
      traverse(child, fn);
    });
  }
}

function wrapVNode(vNode, parent) {
  var children = vNode.children;

  if (children && typeof children.map === 'function') {
    children = children.map(function (k) {
      return wrapVNode(k, vNode);
    });
  }
  vNode.parent = parent;
  return vNode;
}

function match(sel, vNode) {
  var selector = (0, _language2.default)(sel);
  var matched = [];

  var wrappedVNode = wrapVNode(vNode);

  traverse(wrappedVNode, function (node) {
    var result = void 0;
    if (node.data && node.data.vnode) {
      result = selector(node.data.vnode);
    } else if (node.data && node.data.fn) {
      var _node$data;

      result = selector((_node$data = node.data).fn.apply(_node$data, _toConsumableArray(node.data.args)));
    } else {
      result = selector(node);
    }
    if (result) {
      if (!Array.isArray(result)) {
        result = [result];
      }
      matched.push.apply(matched, result);
    }
  });
  return matched;
}

exports.default = match;
},{"./language":105}],105:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cssauron = require('cssauron');

var _cssauron2 = _interopRequireDefault(_cssauron);

var _selectorParser = require('./selectorParser');

var _selectorParser2 = _interopRequireDefault(_selectorParser);

var _classNameFromVNode = require('./classNameFromVNode');

var _classNameFromVNode2 = _interopRequireDefault(_classNameFromVNode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function LanguageSpecification() {}

LanguageSpecification.prototype.tag = function tag(vNode) {
  return (0, _selectorParser2.default)(vNode.sel).tagName;
};

LanguageSpecification.prototype.class = function klass(vNode) {
  return (0, _classNameFromVNode2.default)(vNode);
};

LanguageSpecification.prototype.id = function id(vNode) {
  if (vNode.data && vNode.data.props && vNode.data.props.id) {
    return vNode.data.props.id;
  } else if (vNode.data && vNode.data.attrs && vNode.data.attrs.id) {
    return vNode.data.attrs.id;
  }
  return (0, _selectorParser2.default)(vNode.sel).id;
};

LanguageSpecification.prototype.children = function children(vNode) {
  return vNode.children || [];
};

LanguageSpecification.prototype.parent = function parent(vNode) {
  return vNode.parent || vNode;
};

LanguageSpecification.prototype.contents = function contents(vNode) {
  return vNode.text;
};

LanguageSpecification.prototype.attr = function attributes(vNode, attr) {
  if (vNode.data) {
    var _vNode$data = vNode.data;
    var _vNode$data$attrs = _vNode$data.attrs;
    var attrs = _vNode$data$attrs === undefined ? {} : _vNode$data$attrs;
    var _vNode$data$props = _vNode$data.props;
    var props = _vNode$data$props === undefined ? {} : _vNode$data$props;

    if (attrs[attr]) {
      return attrs[attr];
    }
    if (props[attr]) {
      return props[attr];
    }
  }
};

var language = (0, _cssauron2.default)(new LanguageSpecification());

exports.default = language;
},{"./classNameFromVNode":103,"./selectorParser":106,"cssauron":108}],106:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = selectorParser;

var _browserSplit = require('browser-split');

var _browserSplit2 = _interopRequireDefault(_browserSplit);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

function selectorParser() {
  var selector = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

  var tagName = void 0;
  var id = '';
  var classes = [];

  var tagParts = (0, _browserSplit2.default)(selector, classIdSplit);

  if (notClassId.test(tagParts[1]) || selector === '') {
    tagName = 'div';
  }

  var part = void 0;
  var type = void 0;
  var i = void 0;

  for (i = 0; i < tagParts.length; i++) {
    part = tagParts[i];

    if (!part) {
      continue;
    }

    type = part.charAt(0);

    if (!tagName) {
      tagName = part;
    } else if (type === '.') {
      classes.push(part.substring(1, part.length));
    } else if (type === '#') {
      id = part.substring(1, part.length);
    }
  }

  return {
    tagName: tagName,
    id: id,
    className: classes.join(' ')
  };
}
},{"browser-split":107}],107:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],108:[function(require,module,exports){
module.exports = language

var tokenizer = require('./tokenizer')

function language(lookups, matchComparison) {
  return function(selector) {
    return parse(selector, remap(lookups),
                 matchComparison || caseSensitiveComparison)
  }
}

function remap(opts) {
  for(var key in opts) if(opt_okay(opts, key)) {
    opts[key] = Function(
        'return function(node, attr) { return node.' + opts[key] + ' }'
    )
    opts[key] = opts[key]()
  }

  return opts
}

function opt_okay(opts, key) {
  return opts.hasOwnProperty(key) && typeof opts[key] === 'string'
}

function parse(selector, options, matchComparison) {
  var stream = tokenizer()
    , default_subj = true
    , selectors = [[]]
    , traversal
    , bits

  bits = selectors[0]

  traversal = {
      '': any_parents
    , '>': direct_parent
    , '+': direct_sibling
    , '~': any_sibling
  }

  stream
    .on('data', group)
    .end(selector)

  function group(token) {
    var crnt

    if(token.type === 'comma') {
      selectors.unshift(bits = [])

      return
    }

    if(token.type === 'op' || token.type === 'any-child') {
      bits.unshift(traversal[token.data])
      bits.unshift(check())

      return
    }

    bits[0] = bits[0] || check()
    crnt = bits[0]

    if(token.type === '!') {
      crnt.subject =
      selectors[0].subject = true

      return
    }

    crnt.push(
        token.type === 'class' ? listContains(token.type, token.data) :
        token.type === 'attr' ? attr(token) :
        token.type === ':' || token.type === '::' ? pseudo(token) :
        token.type === '*' ? Boolean :
        matches(token.type, token.data, matchComparison)
    )
  }

  return selector_fn

  function selector_fn(node, as_boolean) {
    var current
      , length
      , orig
      , subj
      , set

    orig = node
    set = []

    for(var i = 0, len = selectors.length; i < len; ++i) {
      bits = selectors[i]
      current = entry
      length = bits.length
      node = orig
      subj = []

      for(var j = 0; j < length; j += 2) {
        node = current(node, bits[j], subj)

        if(!node) {
          break
        }

        current = bits[j + 1]
      }

      if(j >= length) {
        if(as_boolean) {
          return true
        }

        add(!bits.subject ? [orig] : subj)
      }
    }

    if(as_boolean) {
      return false
    }

    return !set.length ? false :
            set.length === 1 ? set[0] :
            set

    function add(items) {
      var next

      while(items.length) {
        next = items.shift()

        if(set.indexOf(next) === -1) {
          set.push(next)
        }
      }
    }
  }

  function check() {
    _check.bits = []
    _check.subject = false
    _check.push = function(token) {
      _check.bits.push(token)
    }

    return _check

    function _check(node, subj) {
      for(var i = 0, len = _check.bits.length; i < len; ++i) {
        if(!_check.bits[i](node)) {
          return false
        }
      }

      if(_check.subject) {
        subj.push(node)
      }

      return true
    }
  }

  function listContains(type, data) {
    return function(node) {
      var val = options[type](node)
      val =
        Array.isArray(val) ? val :
        val ? val.toString().split(/\s+/) :
        []
      return val.indexOf(data) >= 0
    }
  }

  function attr(token) {
    return token.data.lhs ?
      valid_attr(
          options.attr
        , token.data.lhs
        , token.data.cmp
        , token.data.rhs
      ) :
      valid_attr(options.attr, token.data)
  }

  function matches(type, data, matchComparison) {
    return function(node) {
      return matchComparison(type, options[type](node), data);
    }
  }

  function any_parents(node, next, subj) {
    do {
      node = options.parent(node)
    } while(node && !next(node, subj))

    return node
  }

  function direct_parent(node, next, subj) {
    node = options.parent(node)

    return node && next(node, subj) ? node : null
  }

  function direct_sibling(node, next, subj) {
    var parent = options.parent(node)
      , idx = 0
      , children

    children = options.children(parent)

    for(var i = 0, len = children.length; i < len; ++i) {
      if(children[i] === node) {
        idx = i

        break
      }
    }

    return children[idx - 1] && next(children[idx - 1], subj) ?
      children[idx - 1] :
      null
  }

  function any_sibling(node, next, subj) {
    var parent = options.parent(node)
      , children

    children = options.children(parent)

    for(var i = 0, len = children.length; i < len; ++i) {
      if(children[i] === node) {
        return null
      }

      if(next(children[i], subj)) {
        return children[i]
      }
    }

    return null
  }

  function pseudo(token) {
    return valid_pseudo(options, token.data, matchComparison)
  }

}

function entry(node, next, subj) {
  return next(node, subj) ? node : null
}

function valid_pseudo(options, match, matchComparison) {
  switch(match) {
    case 'empty': return valid_empty(options)
    case 'first-child': return valid_first_child(options)
    case 'last-child': return valid_last_child(options)
    case 'root': return valid_root(options)
  }

  if(match.indexOf('contains') === 0) {
    return valid_contains(options, match.slice(9, -1))
  }

  if(match.indexOf('any') === 0) {
    return valid_any_match(options, match.slice(4, -1), matchComparison)
  }

  if(match.indexOf('not') === 0) {
    return valid_not_match(options, match.slice(4, -1), matchComparison)
  }

  if(match.indexOf('nth-child') === 0) {
    return valid_nth_child(options, match.slice(10, -1))
  }

  return function() {
    return false
  }
}

function valid_not_match(options, selector, matchComparison) {
  var fn = parse(selector, options, matchComparison)

  return not_function

  function not_function(node) {
    return !fn(node, true)
  }
}

function valid_any_match(options, selector, matchComparison) {
  var fn = parse(selector, options, matchComparison)

  return fn
}

function valid_attr(fn, lhs, cmp, rhs) {
  return function(node) {
    var attr = fn(node, lhs)

    if(!cmp) {
      return !!attr
    }

    if(cmp.length === 1) {
      return attr == rhs
    }

    if(attr === void 0 || attr === null) {
      return false
    }

    return checkattr[cmp.charAt(0)](attr, rhs)
  }
}

function valid_first_child(options) {
  return function(node) {
    return options.children(options.parent(node))[0] === node
  }
}

function valid_last_child(options) {
  return function(node) {
    var children = options.children(options.parent(node))

    return children[children.length - 1] === node
  }
}

function valid_empty(options) {
  return function(node) {
    return options.children(node).length === 0
  }
}

function valid_root(options) {
  return function(node) {
    return !options.parent(node)
  }
}

function valid_contains(options, contents) {
  return function(node) {
    return options.contents(node).indexOf(contents) !== -1
  }
}

function valid_nth_child(options, nth) {
  var test = function(){ return false }
  if (nth == 'odd') {
    nth = '2n+1'
  } else if (nth == 'even') {
    nth = '2n'
  }
  var regexp = /( ?([-|\+])?(\d*)n)? ?((\+|-)? ?(\d+))? ?/
  var matches = nth.match(regexp)
  if (matches) {
    var growth = 0;
    if (matches[1]) {
      var positiveGrowth = (matches[2] != '-')
      growth = parseInt(matches[3] == '' ? 1 : matches[3])
      growth = growth * (positiveGrowth ? 1 : -1)
    }
    var offset = 0
    if (matches[4]) {
      offset = parseInt(matches[6])
      var positiveOffset = (matches[5] != '-')
      offset = offset * (positiveOffset ? 1 : -1)
    }
    if (growth == 0) {
      if (offset != 0) {
        test = function(children, node) {
          return children[offset - 1] === node
        }
      }
    } else {
      test = function(children, node) {
        var validPositions = []
        var len = children.length
        for (var position=1; position <= len; position++) {
          var divisible = ((position - offset) % growth) == 0;
          if (divisible) {
            if (growth > 0) {
              validPositions.push(position);
            } else {
              if ((position - offset) / growth >= 0) {
                validPositions.push(position);
              }
            }
          }
        }
        for(var i=0; i < validPositions.length; i++) {
          if (children[validPositions[i] - 1] === node) {
            return true
          }
        }
        return false
      }
    }
  }
  return function(node) {
    var children = options.children(options.parent(node))

    return test(children, node)
  }
}

var checkattr = {
    '$': check_end
  , '^': check_beg
  , '*': check_any
  , '~': check_spc
  , '|': check_dsh
}

function check_end(l, r) {
  return l.slice(l.length - r.length) === r
}

function check_beg(l, r) {
  return l.slice(0, r.length) === r
}

function check_any(l, r) {
  return l.indexOf(r) > -1
}

function check_spc(l, r) {
  return l.split(/\s+/).indexOf(r) > -1
}

function check_dsh(l, r) {
  return l.split('-').indexOf(r) > -1
}

function caseSensitiveComparison(type, pattern, data) {
  return pattern === data;
}

},{"./tokenizer":110}],109:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data === null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


}).call(this,require('_process'))
},{"_process":79,"stream":95}],110:[function(require,module,exports){
module.exports = tokenize

var through = require('through')

var PSEUDOSTART = 'pseudo-start'
  , ATTR_START = 'attr-start'
  , ANY_CHILD = 'any-child'
  , ATTR_COMP = 'attr-comp'
  , ATTR_END = 'attr-end'
  , PSEUDOPSEUDO = '::'
  , PSEUDOCLASS = ':'
  , READY = '(ready)'
  , OPERATION = 'op'
  , CLASS = 'class'
  , COMMA = 'comma'
  , ATTR = 'attr'
  , SUBJECT = '!'
  , TAG = 'tag'
  , STAR = '*'
  , ID = 'id'

function tokenize() {
  var escaped = false
    , gathered = []
    , state = READY 
    , data = []
    , idx = 0
    , stream
    , length
    , quote
    , depth
    , lhs
    , rhs
    , cmp
    , c

  return stream = through(ondata, onend)

  function ondata(chunk) {
    data = data.concat(chunk.split(''))
    length = data.length

    while(idx < length && (c = data[idx++])) {
      switch(state) {
        case READY: state_ready(); break
        case ANY_CHILD: state_any_child(); break
        case OPERATION: state_op(); break
        case ATTR_START: state_attr_start(); break
        case ATTR_COMP: state_attr_compare(); break
        case ATTR_END: state_attr_end(); break
        case PSEUDOCLASS:
        case PSEUDOPSEUDO: state_pseudo(); break
        case PSEUDOSTART: state_pseudostart(); break
        case ID:
        case TAG:
        case CLASS: state_gather(); break
      }
    }

    data = data.slice(idx)
  }

  function onend(chunk) {
    if(arguments.length) {
      ondata(chunk)
    }

    if(gathered.length) {
      stream.queue(token())
    }
  }

  function state_ready() {
    switch(true) {
      case '#' === c: state = ID; break
      case '.' === c: state = CLASS; break
      case ':' === c: state = PSEUDOCLASS; break
      case '[' === c: state = ATTR_START; break
      case '!' === c: subject(); break
      case '*' === c: star(); break
      case ',' === c: comma(); break
      case /[>\+~]/.test(c): state = OPERATION; break
      case /\s/.test(c): state = ANY_CHILD; break
      case /[\w\d\-_]/.test(c): state = TAG; --idx; break
    }
  }

  function subject() {
    state = SUBJECT
    gathered = ['!']
    stream.queue(token())
    state = READY
  }

  function star() {
    state = STAR
    gathered = ['*']
    stream.queue(token())
    state = READY
  }

  function comma() {
    state = COMMA
    gathered = [',']
    stream.queue(token())
    state = READY
  }

  function state_op() {
    if(/[>\+~]/.test(c)) {
      return gathered.push(c)
    }

    // chomp down the following whitespace.
    if(/\s/.test(c)) {
      return
    }

    stream.queue(token())
    state = READY
    --idx
  }

  function state_any_child() {
    if(/\s/.test(c)) {
      return
    }

    if(/[>\+~]/.test(c)) {
      return --idx, state = OPERATION
    }

    stream.queue(token())
    state = READY
    --idx
  }

  function state_pseudo() {
    rhs = state
    state_gather(true)

    if(state !== READY) {
      return
    }

    if(c === '(') {
      lhs = gathered.join('')
      state = PSEUDOSTART
      gathered.length = 0
      depth = 1
      ++idx

      return
    }

    state = PSEUDOCLASS
    stream.queue(token())
    state = READY
  }

  function state_pseudostart() {
    if(gathered.length === 0 && !quote) {
      quote = /['"]/.test(c) ? c : null

      if(quote) {
        return
      }
    }

    if(quote) {
      if(!escaped && c === quote) {
        quote = null

        return
      }

      if(c === '\\') {
        escaped ? gathered.push(c) : (escaped = true)

        return
      }

      escaped = false
      gathered.push(c)

      return
    }

    gathered.push(c)

    if(c === '(') {
      ++depth
    } else if(c === ')') {
      --depth
    }
    
    if(!depth) {
      gathered.pop()
      stream.queue({
          type: rhs 
        , data: lhs + '(' + gathered.join('') + ')'
      })

      state = READY
      lhs = rhs = cmp = null
      gathered.length = 0
    }

    return 
  }

  function state_attr_start() {
    state_gather(true)

    if(state !== READY) {
      return
    }

    if(c === ']') {
      state = ATTR
      stream.queue(token())
      state = READY

      return
    }

    lhs = gathered.join('')
    gathered.length = 0
    state = ATTR_COMP
  }

  function state_attr_compare() {
    if(/[=~|$^*]/.test(c)) {
      gathered.push(c)
    }

    if(gathered.length === 2 || c === '=') {
      cmp = gathered.join('')
      gathered.length = 0
      state = ATTR_END
      quote = null

      return
    }
  }

  function state_attr_end() {
    if(!gathered.length && !quote) {
      quote = /['"]/.test(c) ? c : null

      if(quote) {
        return
      }
    }

    if(quote) {
      if(!escaped && c === quote) {
        quote = null

        return
      }

      if(c === '\\') {
        if(escaped) {
          gathered.push(c)
        }

        escaped = !escaped

        return
      }

      escaped = false
      gathered.push(c)

      return
    }

    state_gather(true)

    if(state !== READY) {
      return
    }

    stream.queue({
        type: ATTR
      , data: {
            lhs: lhs
          , rhs: gathered.join('')
          , cmp: cmp
        }
    })

    state = READY
    lhs = rhs = cmp = null
    gathered.length = 0

    return 
  }

  function state_gather(quietly) {
    if(/[^\d\w\-_]/.test(c) && !escaped) {
      if(c === '\\') {
        escaped = true
      } else {
        !quietly && stream.queue(token())
        state = READY
        --idx
      }

      return
    }

    escaped = false
    gathered.push(c)
  }

  function token() {
    var data = gathered.join('')

    gathered.length = 0

    return {
        type: state
      , data: data
    }
  }
}

},{"through":109}],111:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],112:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./init":113,"./modules/attributes":114,"./modules/style":115,"dup":25}],113:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./container-elements":111,"./parse-selector":116,"./void-elements":117,"dup":26}],114:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"../parse-selector":116,"dup":27,"lodash.escape":119,"lodash.forown":121,"lodash.union":133}],115:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28,"lodash.escape":119,"lodash.forown":121,"lodash.kebabcase":128}],116:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"browser-split":118,"dup":29}],117:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30}],118:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],119:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32,"lodash._root":120}],120:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],121:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"dup":34,"lodash._basefor":122,"lodash._bindcallback":123,"lodash.keys":124}],122:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],123:[function(require,module,exports){
arguments[4][36][0].apply(exports,arguments)
},{"dup":36}],124:[function(require,module,exports){
arguments[4][37][0].apply(exports,arguments)
},{"dup":37,"lodash._getnative":125,"lodash.isarguments":126,"lodash.isarray":127}],125:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],126:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],127:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],128:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"dup":41,"lodash.deburr":129,"lodash.words":131}],129:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"dup":42,"lodash._root":130}],130:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],131:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"dup":44,"lodash._root":132}],132:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],133:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"dup":46,"lodash._baseflatten":134,"lodash._baseuniq":137,"lodash.restparam":142}],134:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"dup":47,"lodash.isarguments":135,"lodash.isarray":136}],135:[function(require,module,exports){
arguments[4][39][0].apply(exports,arguments)
},{"dup":39}],136:[function(require,module,exports){
arguments[4][40][0].apply(exports,arguments)
},{"dup":40}],137:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"dup":50,"lodash._baseindexof":138,"lodash._cacheindexof":139,"lodash._createcache":140}],138:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51}],139:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"dup":52}],140:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53,"lodash._getnative":141}],141:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38}],142:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],143:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (html) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];


    var context = options.context || document;

    // If there's nothing here, return null;
    if (!html) {
        return null;
    }

    // Maintain a list of created vnodes so we can call the create hook.
    var createdVNodes = [];

    // Parse the string into the AST and convert to VNodes.
    var vnodes = convertNodes((0, _parse2.default)(html), createdVNodes, context);

    var res = void 0;
    if (!vnodes) {
        // If there are no vnodes but there is string content, then the string
        // must be just text or at least invalid HTML that we should treat as
        // text (since the AST parser didn't find any well-formed HTML).
        res = toVNode({ type: 'text', content: html }, createdVNodes, context);
    } else if (vnodes.length === 1) {
        // If there's only one root node, just return it as opposed to an array.
        res = vnodes[0];
    } else {
        // Otherwise we have an array of VNodes, which we should return.
        res = vnodes;
    }

    // Call the 'create' hook for each created node.
    options.hooks && options.hooks.create && createdVNodes.forEach(function (node) {
        options.hooks.create(node);
    });
    return res;
};

var _parse = require('html-parse-stringify2/lib/parse');

var _parse2 = _interopRequireDefault(_parse);

var _h = require('snabbdom/h');

var _h2 = _interopRequireDefault(_h);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function convertNodes(nodes, createdVNodes, context) {
    if (nodes instanceof Array && nodes.length > 0) {
        return nodes.map(function (node) {
            return toVNode(node, createdVNodes, context);
        });
    } else {
        return undefined;
    }
}

function toVNode(node, createdVNodes, context) {
    var newNode = void 0;
    if (node.type === 'text') {
        newNode = (0, _utils.createTextVNode)(node.content, context);
    } else {
        newNode = (0, _h2.default)(node.name, buildVNodeData(node, context), convertNodes(node.children, createdVNodes, context));
    }
    createdVNodes.push(newNode);
    return newNode;
}

function buildVNodeData(node, context) {
    var data = {};
    if (!node.attrs) {
        return data;
    }

    var attrs = Object.keys(node.attrs).reduce(function (memo, name) {
        if (name !== 'style' && name !== 'class') {
            var val = (0, _utils.unescapeEntities)(node.attrs[name], context);
            memo ? memo[name] = val : memo = _defineProperty({}, name, val);
        }
        return memo;
    }, null);
    if (attrs) {
        data.attrs = attrs;
    }

    var style = parseStyle(node);
    if (style) {
        data.style = style;
    }

    var classes = parseClass(node);
    if (classes) {
        data.class = classes;
    }

    return data;
}

function parseStyle(node) {
    try {
        return node.attrs.style.split(';').reduce(function (memo, styleProp) {
            var res = styleProp.split(':');
            var name = (0, _utils.transformName)(res[0].trim());
            if (name) {
                var val = res[1].replace('!important', '').trim();
                memo ? memo[name] = val : memo = _defineProperty({}, name, val);
            }
            return memo;
        }, null);
    } catch (e) {
        return null;
    }
}

function parseClass(node) {
    try {
        return node.attrs.class.split(' ').reduce(function (memo, className) {
            className = className.trim();
            if (className) {
                memo ? memo[className] = true : memo = _defineProperty({}, className, true);
            }
            return memo;
        }, null);
    } catch (e) {
        return null;
    }
}
},{"./utils":144,"html-parse-stringify2/lib/parse":102,"snabbdom/h":146}],144:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createTextVNode = createTextVNode;
exports.transformName = transformName;
exports.unescapeEntities = unescapeEntities;

var _vnode = require('snabbdom/vnode');

var _vnode2 = _interopRequireDefault(_vnode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createTextVNode(text, context) {
    return (0, _vnode2.default)(undefined, undefined, undefined, unescapeEntities(text, context));
}

function transformName(name) {
    // Replace -a with A to help camel case style property names.
    name = name.replace(/-(\w)/g, function _replace($1, $2) {
        return $2.toUpperCase();
    });
    // Handle properties that start with a -.
    var firstChar = name.charAt(0).toLowerCase();
    return '' + firstChar + name.substring(1);
}

// Regex for matching HTML entities.
var entityRegex = new RegExp('&[a-z0-9#]+;', 'gi');
// Element for setting innerHTML for transforming entities.
var el = null;

function unescapeEntities(text, context) {
    // Create the element using the context if it doesn't exist.
    if (!el) {
        el = context.createElement('div');
    }
    return text.replace(entityRegex, function (entity) {
        el.innerHTML = entity;
        return el.textContent;
    });
}
},{"snabbdom/vnode":148}],145:[function(require,module,exports){
module.exports = require('./lib/strings');

},{"./lib/strings":143}],146:[function(require,module,exports){
var VNode = require('./vnode');
var is = require('./is');

function addNS(data, children) {
  data.ns = 'http://www.w3.org/2000/svg';
  if (children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (c !== undefined) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (b !== undefined) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children);
  }
  return VNode(sel, data, children, text, undefined);
};

},{"./is":147,"./vnode":148}],147:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"dup":58}],148:[function(require,module,exports){
arguments[4][67][0].apply(exports,arguments)
},{"dup":67}],149:[function(require,module,exports){
/**
 * This file automatically generated from `pre-publish.js`.
 * Do not manually edit.
 */

module.exports = {
  "area": true,
  "base": true,
  "br": true,
  "col": true,
  "embed": true,
  "hr": true,
  "img": true,
  "input": true,
  "keygen": true,
  "link": true,
  "menuitem": true,
  "meta": true,
  "param": true,
  "source": true,
  "track": true,
  "wbr": true
};

},{}]},{},[99]);
