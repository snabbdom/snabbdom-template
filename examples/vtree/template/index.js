var st = require('../../../')
var sh = require('snabbdom/h')
var s2h = require('snabbdom-to-html')

var tmpl = function (state) {
  var main = sh('ul#mapme', [sh('li', 'a'), sh('li', 'b'), sh('li', 'c')])
  var numArr = ['one', 'two', 'three', 'four'];
  var content = {
    '#mapme': {_map: {'li': numArr}}
  }
  var ret = st(main, content)
  console.log('m',s2h(main))
  console.log(content)
  console.log('r',ret)
  console.log('h',s2h(ret))
  return ret
}
tmpl()
