var st = require('../../../')
var fs = require('fs')
var sh = require('snabbdom/h')
var s2h = require('snabbdom-to-html')

var main = fs.readFileSync(__dirname + '/main.html', 'utf-8')
var tmpl = function (state) {
  var content = sh('div.testing', 'content')
  var ret = st(main, content)
  console.log(content)
  console.log('r',ret)
  console.log('h',s2h(ret))
  return ret
}
tmpl()
