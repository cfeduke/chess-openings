/** Small helpers for building and updating DOM by hand. */

type Attributes = Record<string, string | number>;

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
}

/** Creates an element with attributes (`class` included) and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  setAttributes(element, attributes);
  element.append(...children);
  return element;
}

/**
 * A CSS class held by a changing set of elements. The returned function hands the class to
 * `holders` and takes it away from whoever held it before.
 */
export function exclusiveClass(className: string): (holders: (Element | undefined)[]) => void {
  let current: Element[] = [];
  return (holders) => {
    for (const holder of current) holder.classList.remove(className);
    current = holders.filter((holder) => holder !== undefined);
    for (const holder of current) holder.classList.add(className);
  };
}
