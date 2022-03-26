

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
  //console.log(result)
  for (let i = 0; i < result.length; i++) {
    const argName = result[i]
    if (argName === '{') {
      structured = []
      result.splice(i--, 1)
    }
    else if (structured) {
      result.splice(i, 1)
      if (argName === '}') {
        result.splice(i, 0, structured)
        structured = null
      } else {
        structured.push(argName)
      }
      i--
    }
  }
  return result;
}

module.exports = {
  getParamNames,
}