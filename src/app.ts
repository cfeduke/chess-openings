export function mountApp(root: HTMLElement): void {
  const heading = document.createElement('h1');
  heading.textContent = 'Chess Openings';
  root.replaceChildren(heading);
}
