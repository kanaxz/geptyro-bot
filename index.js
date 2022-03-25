const fs = require('fs');
const MODULES_PATH = './modules'

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

const getParamNames = (func) => {
  if (!func)
    debugger
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if (result === null)
    result = [];
  let structured
  for (let i = 0; i < result.length; i++) {
    const argName = result[i]
    if (argName === '{') {
      structured = []
      result.splice(i--, 1)
    }
    else if (structured) {
      result.splice(i--, 1)
      if (argName === '}') {
        result.splice(i, 0, structured)
        structured = null
      } else {
        structured.push(argName)
      }
    }
  }
  return result;
}

const modulesInits = {}
const modules = {}

const initModule = async (moduleName) => {

  if (modules[moduleName]) {
    return
  }

  let [dependenciesNames] = getParamNames(modulesInits[moduleName])
  if (!(dependenciesNames instanceof Array)) {
    dependenciesNames = []
  }

  for (const dependencyName of dependenciesNames) {
    await initModule(dependencyName)
  }
  const dependencies = dependenciesNames.reduce((acc, dependencyName) => {
    acc[dependencyName] = modules[dependencyName]
    return acc
  }, {})
  modules[moduleName] = await modulesInits[moduleName](dependencies)
}

const initModules = async () => {
  const files = fs.readdirSync(MODULES_PATH);
  for (const file of files) {
    const moduleName = file.replace('.js', '')
    let moduleIndexPath = `${MODULES_PATH}/${file}`

    const stat = fs.statSync(moduleIndexPath)
    if (stat.isDirectory()) {
      moduleIndexPath += '/index.js'
      if (!fs.existsSync(moduleIndexPath)) {
        continue
      }
    }
    modulesInits[moduleName] = require(moduleIndexPath)
  }

  for (const moduleName in modulesInits) {
    await initModule(moduleName)
  }
}

initModules()
