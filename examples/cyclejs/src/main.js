import Cycle from '@cycle/xstream-run';
import {div, label, input, hr, h1, makeDOMDriver} from '@cycle/dom';
import st from 'snabbdom-template';

const fs = require('fs');
const template = fs.readFileSync('template.html', 'utf-8');

function main(sources) {
  return {
    DOM: sources.DOM.select('.myinput').events('input')
      .map(ev => ev.target.value)
      .startWith('')
      .map(name =>
        st(template, {'#output': name})
        /*div([
          label('Name:'),
          input('.myinput', {attrs: {type: 'text'}}),
          hr(),
          h1(`Hello ${name}`)
        ])*/
      )
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container')
});
