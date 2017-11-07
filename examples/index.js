var st = require('../')
var fs = require('fs')
var mL = require('main-loop')

var patch = require('snabbdom').init([
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/style').default,
  require('snabbdom/modules/eventlisteners').default
])

var initstate = {n:0}

//* remove a slash to toggle code
var outer = fs.readFileSync(__dirname + '/public/mainsimple.html', 'utf-8')
var template = fs.readFileSync(__dirname + '/public/template.html', 'utf-8')

var tmpl = function (state) {
  var numArr = ['one', 'two', 'three', 'four'];
  var content = {
    'span#cc': {class: 'testing132', '_html': 'yup'},
    '#clicks': 'Clicks: ' + state.n,
    '#mapme': {_map: {'li': numArr}},
    //'button': {type: 'button', 'onclick': onclick, '_html': 'click me?'}
    'button': {type: 'button', '_on': {click: onclick}, '_html': 'click me?'}
  }
  return st([outer, template], content)
}
/*/
var outer = fs.readFileSync(__dirname + '/public/mainsimple.html', 'utf-8')
var section = fs.readFileSync('examples/public/section.html', 'utf-8')
var inner = fs.readFileSync('examples/public/button.html', 'utf-8')
var tmpl = function (state) {
  return st([outer, section, inner], {
    '#count': state.n,
    'button': {'_on': {click: onclick}}
  })
}
//*/

var loop = mL(initstate, tmpl, {
  target: document.getElementById('content'),
  diff: function (tree, newTree) { return newTree }, // snabbdom incorporates diff in patch
  patch: patch
})
loop.update(initstate)

function onclick () {
  initstate.n++
  loop.update(initstate)
}

