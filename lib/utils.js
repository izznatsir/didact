export function isProperty(key) {
  return key !== 'children' && !isEventHandlerProp(key)
}

export function isEventHandlerProp(key) {
  return key.startsWith('on')
}

export function isNewProp(prev, next) {
  return (key) => {
    return prev[key] !== next[key]
  }
}

export function isPropGone(next) {
  return (key) => {
    return !(key in next)
  }
}