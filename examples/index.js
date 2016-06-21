var shaved = require('../')
var fs = require('fs')
var sd = require('snabbdom')
var s2h = require('snabbdom-to-html')

//*
var outer = fs.readFileSync(__dirname + '/public/mainsimple.html', 'utf-8')
var template = fs.readFileSync('examples/public/template.html', 'utf-8')
//var simple = fs.readFileSync('examples/public/simplebutton.html', 'utf-8')
var tmpl = function (state) {
  var numArr = ['one', 'two', 'three', 'four'];
  var content = {
    'span#cc': {class: 'testing132', '_html': 'yup'},
    '#clicks': 'Clicks: ' + state.n,
    '#mapme': {_map: {'li': numArr}},
    'button': {type: 'button', onclick: onclick, '_html': 'click me?'}
  }
  var ret = shaved([outer, template], content)
  console.log(content)
  console.log('r',ret)
  console.log('h',s2h(ret))
  return ret
}
/*/
var outer = fs.readFileSync(__dirname + '/public/mainsimple.html', 'utf-8')
var section = fs.readFileSync('examples/public/section.html', 'utf-8')
var inner = fs.readFileSync('examples/public/button.html', 'utf-8')
var tmpl = function (state) {
  return shaved([outer, section, inner], {
    '#count': state.n,
    'button': {onclick: onclick}
  })
}
//*/
tmpl({n:0})
function onclick () { loop.update({ n: state.n + 1 }) }
