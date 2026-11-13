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
 * A mark held by a changing set of elements. The returned function gives the mark to `holders`
 * and takes it away from whoever held it before — wherever they are, attached to the page or not.
 */
function exclusive(
  give: (holder: Element) => void,
  take: (holder: Element) => void,
): (holders: (Element | null | undefined)[]) => void {
  let current: Element[] = [];
  return (holders) => {
    current.forEach(take);
    current = holders.filter((holder) => holder != null);
    current.forEach(give);
  };
}

/** A CSS class that only the latest holders have. */
export const exclusiveClass = (className: string) =>
  exclusive(
    (holder) => holder.classList.add(className),
    (holder) => holder.classList.remove(className),
  );

/** An attribute, such as `aria-current`, that only the latest holders have. */
export const exclusiveAttribute = (name: string, value: string) =>
  exclusive(
    (holder) => holder.setAttribute(name, value),
    (holder) => holder.removeAttribute(name),
  );
