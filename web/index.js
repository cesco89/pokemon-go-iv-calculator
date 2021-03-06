const B = require('react-bootstrap')
const DustToLevel = require('../json/dust-to-level.json')
const Moves = require('../json/moves.json')
const Pokemon = require('../json/pokemon.json')
const React = require('react')
const ReactDOM = require('react-dom')
const Select = require('react-select')
const Spinner = require('react-spinkit')
const bestMovesFor = require('../src/best-moves')
const finalEvolutions = require('../json/finalEvolutions')
const findPokemon = require('../src/findPokemon')
const localforage = require('localforage')
const magic = require('../src/magic')
const n = require('./n')
const powerupTools = require('../src/powerup')

const Mon = Pokemon.reduce((obj, mon) => {
  obj[mon.name] = mon.id
  return obj
}, {})

function getWithContext(values) {
  const third = Math.floor(values.length / 3)
  var l = 0

  return values.reduce((arr, value, i) => {
    if (l < 3) {
      arr.push(value)
      l += 1
    } else if (i >= third && l < 7) {
      arr.push(value)
      l += 1
    } else if (i > values.length - 4 & l < 10) {
      arr.push(value)
      l += 1
    }

    return arr
  }, [])
}

const Alt = require('../../alt/')
const alt = new Alt()

const actions = alt.generateActions('InventoryActions', [
  'changedName',
  'changedCP',
  'changedHP',
  'changedStardust',
  'changedLevel',
  'changedTrainerLevel',
  'imageProcessing',
  'resultsCalculated',
  'resultsReset',
  'trainerLevelChanged',
  'valuesReset',
])

const moveActions = alt.generateActions('MoveActions', [
  'movesChanged',
  'pokemonChanged',
])

function changeTrainerLevel(trainerLevel) {
  localforage.setItem('pogoivcalc.trainerLevel', trainerLevel)
  actions.trainerLevelChanged(trainerLevel)
}

class Inventory extends Alt.Store {
  constructor() {
    super()
    this.bindActions(actions)
    this.state = {
      name: 'FLAREON',
      cp: 1418,
      hp: 84,
      stardust: '2500',
      trainerLevel: 27,
      level: 0,
      results: null,
      processingImage: false,
    }
  }

  fromEvent(ev) {
    return ev.currentTarget.value
  }

  changedName(name) {
    this.setState({ name })
  }

  imageProcessing() {
    this.setState({ processingImage: true })
  }

  changedCP(ev) {
    const cp = this.fromEvent(ev)
    this.setState({ cp })
  }

  changedHP(ev) {
    const hp = this.fromEvent(ev)
    this.setState({ hp })
  }

  changedStardust(stardust) {
    this.setState({ stardust })
  }

  changedTrainerLevel(ev) {
    const trainerLevel = Number(this.fromEvent(ev))
    this.setState({ trainerLevel })
  }

  changedLevel(ev) {
    const level = this.fromEvent(ev)
    this.setState({ level })
  }

  resultsCalculated(results) {
    this.setState({ results: results.asObject() })
  }

  trainerLevelChanged(trainerLevel) {
    this.setState({ trainerLevel })
  }

  valuesReset() {
    this.setState({
      name: '',
      cp: 0,
      hp: 0,
      stardust: '',
      level: 0,
      results: null,
      processingImage: false,
    })
  }

  resultsReset() {
    this.setState({ results: null })
  }
}

class MovesStore extends Alt.Store {
  constructor() {
    super()
    this.state = {
      moves: [],
      pokemon: [],
    }
    this.bindActions(moveActions)
  }

  movesChanged(moves) {
    this.setState({ moves })
  }

  pokemonChanged(pokemon) {
    this.setState({ pokemon })
  }
}

const historyActions = alt.generateActions('HistoryActions', [
  'pokemonChecked',
])

class HistoryStore extends Alt.Store {
  constructor() {
    super()
    this.state = {
      searches: []
    }
    this.bindActions(historyActions)
  }

  pokemonChecked(pokemon) {
    const searches = [pokemon].concat(this.state.searches.slice(0, 9))
    this.setState({ searches })
    localforage.setItem('pogoivcalc.searches', searches)
  }
}

const inventoryStore = alt.createStore('InventoryStore', new Inventory())
const movesStore = alt.createStore('MovesStore', new MovesStore())
const historyStore = alt.createStore('HistoryStore', new HistoryStore())




const options = Pokemon.map(x => ({ value: x.name, label: x.name }))
const dustOptions = Object.keys(DustToLevel).map(x => ({ value: x, label: x }))

const moves = options.slice()
moves.push.apply(moves, Moves.map(x => ({ value: x.Name, label: x.Name })))

const logName = x => actions.changedName(x.value)
const logStardust = x => actions.changedStardust(x.value)

const sweetMoves = (x) => {
  if (Mon.hasOwnProperty(x.value)) {
    const best = bestMovesFor(x.value)
    const mon = Pokemon[Mon[x.value] - 1]
    moveActions.pokemonChanged([])
    moveActions.movesChanged(best)
  } else {
    moveActions.movesChanged([])
    moveActions.pokemonChanged(
      Pokemon.filter(mon => (
        mon.moves1.some(m => m.Name === x.value) ||
        mon.moves2.some(m => m.Name === x.value)
      )).map(x => x.name)
    )
  }
}

function calculateValues(nextState) {
  const state = nextState || inventoryStore.getState()
  try {
    const values = {
      name: state.name,
      cp: Number(state.cp),
      hp: Number(state.hp),
      stardust: Number(state.stardust),
      level: state.level ? Number(state.level) : null,
      trainerLevel: Number(state.trainerLevel) || 27,
    }
    const results = magic(values)
    actions.resultsCalculated(results)
    historyActions.pokemonChecked({
      text: `${state.name} ${state.cp}CP`,
      values,
    })
  } catch (err) {
    alert('Looks like there is a problem with the values you entered.')
  }
}

const Styles = {
  resultsRow: {
    textAlign: 'center',
  },

  pokemonImage: {
    alignItems: 'center',
    display: 'flex',
    height: 150,
    margin: '-16px auto',
    justifyContent: 'center',
    width: 150,
  },

  bigText: {
    fontSize: '1.5em',
    fontWeight: 'bold',
  },
}

function Results(props) {
  var bestMoves = null
  if (finalEvolutions[props.pokemon.name]) {
    bestMoves = bestMovesFor(props.pokemon.name, props.best.ivs.IndAtk)
  }

  console.log(props)

  return (
    n('div', [
      n(B.Row, [
        n(B.Button, { onClick: actions.resultsReset }, 'Check Another'),
      ]),

      n(B.Row, { style: Styles.resultsRow }, [
        n('div', { style: Styles.bigText }, props.pokemon.name),
        n('div', `CP: ${props.pokemon.cp} | HP: ${props.pokemon.hp}`),
        n('div', { style: Styles.pokemonImage }, [
          n('img', { src: `images/${props.pokemon.name}.png`, height: 150, width: 150 }),
        ]),
        n(
          'div',
          { style: Styles.bigText },
          props.range.iv[0] === props.range.iv[1]
            ? `${props.range.iv[0]}%`
            : `${props.range.iv[0]}% - ${props.range.iv[1]}%`
        ),
        n('div', { style: Styles.resultsRow }, [
          props.chance === 100
            ? `Keep your ${props.pokemon.cp}CP ${props.pokemon.name}`
            : props.chance === 0
              ? `Send this Pokemon to the grinder for candy.`
              : `Maybe you should keep this Pokemon around.`
        ]),
      ]),

      n(B.Row, [
        n('h3', { style: Styles.resultsRow }, `Possible values (${props.values.length})`),
        n('p', { style: Styles.resultsRow }, [
          props.values.length === 1
            ? n('span', 'Congrats, here are your Pokemon\'s values')
            : n('span', [
              'There are ',
              n('strong', props.values.length),
              ' possibilities and a ',
              n('strong', `${props.chance}%`),
              ` chance you will have a good ${props.pokemon.name}. `,
              props.values.length > 10 && (
                n('span', [
                  'We are showing up to ',
                  n('strong', 10),
                  ' possibilities below. ',
                ])
              ),
              'Highlighted rows show even levels since you can only catch even leveled Pokemon.',
            ]),
        ]),
        n(B.Table, {
          bordered: true,
        }, [
          n('thead', [
            n('tr', [
              n('th', 'IV'),
              n('th', 'Level'),
              n('th', 'CP %'),
              n('th', 'HP %'),
              n('th', 'Battle %'),
            ]),
          ]),
          n('tbody', getWithContext(props.values).map((value) => (
            n('tr', {
              style: {
                backgroundColor: Number(value.Level) % 1 === 0 ? '#fef4f4' : '',
              },
            }, [
              n('td', [
                n(B.Label, {
                  bsStyle: value.percent.PerfectIV > 80
                    ? 'success'
                    : value.percent.PerfectIV > 69
                    ? 'warning'
                    : 'danger',
                }, `${value.percent.PerfectIV}%`),
                ' ',
                n('strong', value.strings.iv),
              ]),
              n('td', value.Level),
              n('td', value.percent.PercentCP),
              n('td', value.percent.PercentHP),
              n('td', value.percent.PercentBatt),
            ])
          ))),
        ]),
      ]),

      // We should only show best moveset if it is in its final evolved form...
      bestMoves && (
        n(B.Row, [
          n('h3', { style: Styles.resultsRow }, `Best moveset combos for ${props.pokemon.name}`),
          n(B.Table, {
            bordered: true,
            condensed: true,
            hover: true,
            striped: true,
          }, [
            n('thead', [
              n('tr', [
                n('th', 'Quick Move'),
                n('th', 'Charge Move'),
                n('th', 'Combo DPS'),
              ]),
            ]),
            n('tbody', bestMoves.map((move) => (
              n('tr', [
                n('td', move.quick.name),
                n('td', move.charge.name),
                n('td', move.dps),
              ])
            ))),
          ]),
        ])
      ),

      props.best.meta.EvolveCP && (
        n(B.Row, { style: Styles.resultsRow }, [
          n('h3', 'Evolution'),
          n(B.Panel, [
            n('span', `If evolved it would have a CP of about ${props.best.meta.EvolveCP}`),
          ]),
        ])
      ),

      n(B.Row, { style: Styles.resultsRow }, [
        n('h3', { style: Styles.resultsRow }, `Maxing out to level ${props.best.meta.MaxLevel}`),
        props.pokemon.level === null && (
          n('p', `Assuming that your Pokemon's current level is ${props.best.Level}. The information below is just an estimate.`)
        ),
        n(B.ListGroup, [
          n(B.ListGroupItem, `Current level: ${props.best.Level}`),
          n(B.ListGroupItem, `Candy cost: ${props.best.meta.Candy}`),
          n(B.ListGroupItem, `Stardust cost: ${props.best.meta.Stardust}`),
          n(B.ListGroupItem, `CP: ${props.best.meta.MaxCP}`),
          n(B.ListGroupItem, `HP: ${props.best.meta.MaxHP}`),
        ]),
      ]),

      n(B.Row, [
        n('h3', { style: Styles.resultsRow }, 'Yours vs Perfect by level'),
        n(B.Table, {
          bordered: true,
          condensed: true,
          hover: true,
          striped: true,
        }, [
          n('thead', [
            n('tr', [
              n('th', 'Level'),
              n('th', 'Your CP'),
              n('th', 'Best CP'),
              n('th', 'Your HP'),
              n('th', 'Best HP'),
            ]),
          ]),
          n('tbody', props.values.reduce((o, value) => {
            if (o._[value.Level]) return o
            o._[value.Level] = 1
            o.rows.push(
              n('tr', [
                n('td', value.Level),
                n('td', value.CP),
                n('td', value.meta.MaxLevelCP),
                n('td', value.HP),
                n('td', value.meta.MaxLevelHP),
              ])
            )
            return o
          }, { rows: [], _: {} }).rows),
        ]),
      ]),
    ])
  )
}

function scanResults(data) {
  const obj = {}
  data.lines.forEach((line) => {
    console.log(line.text)
    if (/CP/.test(line.text)) {
      const singledCp = line.text.split(' ').filter(x => /CP/.test(x))
      if (singledCp.length) {
        obj.cp = Number(singledCp[0].replace(/\D/g, ''))
      }
    } else if (/HP/.test(line.text)) {
      obj.hp = Number(line.text.split('/')[1].trim())
    } else if (Mon.hasOwnProperty(line.text.trim())) {
      obj.name = line.text.trim()
    }
  })
  return obj
}

function pictureUploaded(ev) {
  const files = ev.target.files
  const url = window.URL.createObjectURL(files[0])

  const photoCanvas = document.getElementById('capturedPhoto')
  const ctx = photoCanvas.getContext('2d')

  actions.imageProcessing()

  const img = new Image()
  img.onload = function () {
    ctx.drawImage(img, 0, 0, 750, 1334)

    window.Tesseract.recognize(img, { lang: 'eng' }).then((data) => {
      window.URL.revokeObjectURL(url)
      const obj = scanResults(data)

      console.log(obj)

      actions.valuesReset()
      if (obj.cp) actions.changedCP({ currentTarget: { value: obj.cp }})
      if (obj.hp) actions.changedHP({ currentTarget: { value: obj.hp }})
      if (obj.name) actions.changedName(obj.name)
    })
  }
  img.src = url
}

function PictureUpload(props) {
  if (props.processingImage) {
    return n(Spinner, { spinnerName: 'three-bounce' })
  }

  return n(B.Row,[
    n(B.FormGroup, { controlId: 'screenshot' }, [
      n(B.ControlLabel, 'Select Screenshot'),
      n('input', {
        type: 'file',
        accept: 'image/*',
        capture: 'camera',
        onChange: pictureUploaded,
      }),
    ]),
  ])
}

function MovesCheck(props) {
  return (
    n(B.Row, [
      n(B.PageHeader, 'Check Moves'),
      n(B.FormGroup, { controlId: 'moves' }, [
        n(B.ControlLabel, 'Moves'),
        n(Select, {
          inputProps: {
            autoCorrect: 'off',
            autoCapitalize: 'off',
            spellCheck: 'off',
          },
          name: 'move-selector',
          value: '',
          options: moves,
          onChange: sweetMoves,
        }),
      ]),
      props.pokemon.length && (
        n(B.Panel, props.pokemon.map(mon => (
          n('img', { src: `images/${mon}.png`, height: 60, width: 60 })
        )))
      ) || undefined,
      props.moves.length && (
        n(B.Table, {
          bordered: true,
          condensed: true,
          hover: true,
          striped: true,
        }, [
          n('thead', [
            n('tr', [
              n('th', 'Quick Move'),
              n('th', 'Charge Move'),
              n('th', 'Combo DPS'),
            ]),
          ]),
          n('tbody', props.moves.map((move) => (
            n('tr', [
              n('td', move.quick.name),
              n('td', move.charge.name),
              n('td', move.dps),
            ])
          ))),
        ])
      ) || undefined,
    ])
  )
}

const ConnectedMoves = connect(MovesCheck, {
  listenTo: () => ({ movesStore }),
  getProps: state => state.movesStore,
})

function CheckStardust(props) {
  const dust = DustToLevel[props.stardust] || []
  const minPokemonLevel = Math.min.apply(null, dust)

  const power = powerupTools.howMuchPowerUp(
    Number(props.level || minPokemonLevel),
    Number(props.trainerLevel)
  )

  return (
    n(B.Row, [
      n(B.PageHeader, 'Check stardust and candy cost'),
      n(B.FormGroup, { controlId: 'trainerlevel' }, [
        n(B.ControlLabel, 'Trainer Level'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedTrainerLevel,
          value: props.trainerLevel,
        }),
      ]),
      n(B.FormGroup, { controlId: 'dust' }, [
        n(B.ControlLabel, 'Stardust'),
        n(Select, {
          name: 'stardust-selector',
          value: props.stardust,
          options: dustOptions,
          onChange: logStardust,
        }),
      ]),
      n(B.FormGroup, { controlId: 'level' }, [
        n(B.ControlLabel, 'Pokemon Level (optional)'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedLevel,
          value: props.level,
        }),
      ]),
      power && (
        n(B.ListGroup, [
          n(B.ListGroupItem, `Candy cost: ${power.candy}`),
          n(B.ListGroupItem, `Stardust cost: ${power.stardust}`),
        ])
      ),
    ])
  )
}

function SearchHistory(props) {
  return (
    n(B.Row, [
      n('h3', { style: Styles.resultsRow }, 'Recent Searches'),
      n(B.ListGroup, props.searches.map((search) => (
        n(B.ListGroupItem, [
          n('a', {
            onClick: () => calculateValues(search.values),
          }, search.text),
        ])
      )))
    ])
  )
}

const ConnectedHistory = connect(SearchHistory, {
  listenTo: () => ({ historyStore }),
  getProps: state => state.historyStore,
})

const ConnectedCheckStardust = connect(CheckStardust, {
  // TODO split inventoryStore and use pokemonStore or playerStore
  listenTo: () => ({ inventoryStore }),
  getProps: state => state.inventoryStore,
})

function Form(props) {
  if (props.results) return n('noscript')

  return n('div', [
    n(B.Row, [
      n(B.PageHeader, 'Pokemon Rater'),
    ]),
    n(B.Row, [
//      n(PictureUpload, props),
      n(B.FormGroup, { controlId: 'trainerlevel' }, [
        n(B.ControlLabel, 'Trainer Level'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedTrainerLevel,
          value: props.trainerLevel,
        }),
      ]),
      n(B.FormGroup, { controlId: 'pokemon' }, [
        n(B.ControlLabel, 'Name'),
        n(Select, {
          inputProps: {
            autoCorrect: 'off',
            autoCapitalize: 'off',
            spellCheck: 'off',
          },
          name: 'pokemon-selector',
          value: props.name,
          options,
          onChange: logName,
        }),
      ]),
      n(B.FormGroup, { controlId: 'cp' }, [
        n(B.ControlLabel, 'CP'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedCP,
          onClick: () => actions.changedCP({ currentTarget: { value: '' }}),
          value: props.cp,
        }),
      ]),
      n(B.FormGroup, { controlId: 'hp' }, [
        n(B.ControlLabel, 'HP'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedHP,
          onClick: () => actions.changedHP({ currentTarget: { value: '' }}),
          value: props.hp,
        }),
      ]),
      n(B.FormGroup, { controlId: 'dust' }, [
        n(B.ControlLabel, 'Stardust'),
        n(Select, {
          name: 'stardust-selector',
          value: props.stardust,
          options: dustOptions,
          onChange: logStardust,
        }),
      ]),
      n(B.FormGroup, { controlId: 'level' }, [
        n(B.ControlLabel, 'Pokemon Level (optional)'),
        n(B.FormControl, {
          type: 'number',
          onChange: actions.changedLevel,
          value: props.level,
        }),
      ]),
      n(B.Button, { bsStyle: 'primary', onClick: () => calculateValues() }, 'Calculate'),
      n(B.Button, { onClick: actions.valuesReset }, 'Clear'),
      n(ConnectedHistory),
      n('hr'),
      n(ConnectedMoves),
      n('hr'),
      n(ConnectedCheckStardust),
    ])
  ])
}

function Calculator(props) {
  return n(B.Grid, [
    n(Form, props),
    props.results && n(Results, props.results),
  ])
}



function connect(Component, o) {
  return class ConnectedComponent extends React.Component {
    constructor() {
      super()

      this.stores = o.listenTo()
      this.subscriptions = []

      this.state = this.computeState()
    }

    computeState() {
      return Object.keys(this.stores).reduce((obj, key) => {
        const store = this.stores[key]
        obj[key] = store.getState()
        return obj
      }, {})
    }

    componentDidMount() {
      this.subscriptions = Object.keys(this.stores).map((key) => {
        return this.stores[key].subscribe(
          () => this.setState(this.computeState())
        )
      })
    }

    componentWillUnmount() {
      this.subscriptions.forEach(sub => sub.dispose())
      this.subscriptions = []
    }

    render() {
      return n(Component, o.getProps(this.state, this.props), this.props.children)
    }
  }
}






const ConnectedCalculator = connect(Calculator, {
  listenTo() {
    return { inventoryStore }
  },

  getProps(state, props) {
    return state.inventoryStore
  },
})

localforage.getItem('pogoivcalc.searches').then((searches) => {
  if (searches) alt.load({ HistoryStore: { searches } })
})

localforage.getItem('pogoivcalc.trainerLevel').then((level) => {
  if (level) changeTrainerLevel(level)

  ReactDOM.render(
    n(ConnectedCalculator),
    document.querySelector('#app')
  )
})
