var vTSel = require('snabbdom-selector').default
var vToHTML = require('snabbdom-to-html')
var hToVDOM = require('snabbdom-virtualize/strings').default
//var sh = require('snabbdom/h')
var vNode = require('snabbdom/vnode')
var vText = function (text) {
  return vNode(undefined, undefined, undefined, unescape(text))
}

module.exports = function vDT (templates, contentvars) {
  var vt
  // if arguments are contained in a single object, pull them out
  if ( 'object' === typeof templates && !Array.isArray(templates)
    && undefined === contentvars
  ) {
    contentvars = templates[Object.keys(templates)[1]]
    templates = templates[Object.keys(templates)[0]]
  }
  contentvars = contentvars || {}
  if ( Array.isArray(templates) ) {
    if ( 1 < templates.length ) {
      var start = templates.reverse().shift()
      start = Array.isArray(start)? vNode('div', {}, start): start // wrap div around array of elems
      vt = templates.reduce(function(prev, next) {
        var ret = hToVDOM(next)
        ret = Array.isArray(ret)? vNode('div', {}, ret): ret // wrap div around array of elems
        var tar = vTSel('.template', ret)
        if ( tar.length ) {
          tar[0].children = prev && prev.children || undefined
        }
        else { console.log('Template selector not found.') }
        return ret
      }, hToVDOM(start))
      vt = hToVDOM(vToHTML(vt)) // how to clone?
    }
    else {
      vt = hToVDOM(templates[0])
      vt = Array.isArray(vt)? vNode('div', {}, vt): vt // wrap div around array of elems
    }
  }
  else if ( 'object' === typeof templates ) {
    vt = hToVDOM(vToHTML(templates)) // fixes glitch copying templates
  }
  else {
    vt = hToVDOM(templates)
    vt = Array.isArray(vt)? vNode('div', {}, vt): vt // wrap div around array of elems
  }
  if ( contentvars.sel && contentvars.data ) { // vtree
    var tar = vTSel('.template', vt)
    if ( tar.length ) {
      tar[0].children = contentvars && [contentvars] || undefined
    }
    else { console.log('Template selector not found.') }
  }
  else {
    Object.keys(contentvars).forEach(function (sel) {
      var value = contentvars[sel]
      var target = vTSel(sel, vt)
      if ( target.length ) {
        target = target[0]
        if ( 'string' === typeof value || 'number' === typeof value ) {
          target.children = [vText(value)]
        }
        else if ( 'object' === typeof value  ) {
          Object.keys(value).forEach(function (prop) {
            var targetprops = target.data.attrs = target.data.attrs || {}
            var valprop = value[prop]
            if ( '_html' === prop ) {
              target.children = [vText(valprop)]
            }
            else if ( '_append' === prop ) {
              target.children.push(vText(valprop))
            }
            else if ( '_prepend' === prop ) {
              target.children.unshift(vText(valprop))
            }
            else if (/^_map/.test(prop) && 'object' === typeof valprop && null !== valprop ) {
              Object.keys(valprop).forEach(function (mapkey) {
                var subtmpl = hToVDOM(vToHTML(vTSel(mapkey, target)[0])) // how else to clone?
                if ( '_map' === prop ) { target.children = [] }
                valprop[mapkey].forEach(function (cvars) {
                  var mapd
                  if ( 'string' === typeof cvars ) {
                    subtmpl.children = [vText(cvars)]
                    mapd = hToVDOM(vToHTML(subtmpl)) // how to clone?
                  }
                  else if ( 'object' === typeof cvars ) {
                    mapd = vDT(subtmpl, cvars)
                  }
                  switch ( prop ) {
                    case '_mapprepend': target.children.unshift(mapd); break
                    default: target.children.push(mapd); break
                  }
                })
              })
            }
            else {
              var cur = targetprops[prop] || ''
              if ( valprop && 'object' === typeof valprop && null !== valprop ) {
                if ( valprop.append ) { cur += valprop.append }
                else if ( valprop.prepend ) { cur = valprop.prepend + cur }
              }
              else { cur = valprop }
              targetprops[prop] = cur
            }
          })
        }
        else if ( 'function' === typeof value ) {
          target.children[0].text = value(target.children[0].text)
        }
      } // end if target
      else { console.log('Selector not found. ', sel) }
    })
  }
  return vt
}
