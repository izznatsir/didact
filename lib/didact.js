import { isProperty, isEventHandlerProp, isNewProp, isPropGone } from './utils'

export function createElement(type, props, ...children) {  
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTexElement(child))
    }
  }
}

function createTexElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

let wipRoot = null
let nextUnitOfWork = null
let currentRoot = null
let deletions = null

export function render(el, container) {  
  wipRoot = {
    dom: container,
    props: {
      children: [el]
    },
    alternate: currentRoot
  }
  
  nextUnitOfWork = wipRoot
  deletions = []

  requestIdleCallback(workLoop)
}

function workLoop(deadline) {
  let shouldYield = false

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }

  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling

    nextFiber = nextFiber.parent
  }

  return nextFiber
}

function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]

  reconcileChildren(children)
}

function updateHostComponent(fiber) {
  const elements = fiber.props.children
  
  reconcileChildren(fiber, elements)
}

function reconcileChildren(wipFiber, elements) {
  let index = 0
  let prevSibling = null
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child

  while (index < elements.length) {
    const element = elements[index]
    let newFiber = null

    const isSameType = oldFiber && element && element.type === oldFiber.type

    if (isSameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    } else if (element && !isSameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    } else if (oldFiber && !isSameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }
    
    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT' 
    ? document.createTextNode("") 
    : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isEventHandlerProp)
    .filter(key => {
      return !(key in nextProps) || isNewProp(prevProps, nextProps)(key)
    })
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)

      dom.removeEventListener(eventType, prevProps[name])
    })

  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isPropGone(nextProps))
    .forEach(name => {
    dom[name] = ''
  })

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNewProp(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  Object.keys(nextProps)
    .filter(isEventHandlerProp)
    .filter(isNewProp(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) return

  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  
  const domParent = domParentFiber.dom
  
  switch (fiber.effectTag) {
    case 'PLACEMENT': {
      if (fiber.dom !== null) {
        domParent.appendChild(fiber.dom)
      }

      break
    }
    case 'DELETION': {
      commitDeletion(fiber, domParent)

      break
    }
    case 'UPDATE': {
      if (fiber.dom !== null) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
      }

      break
    }
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}