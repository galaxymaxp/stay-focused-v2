/** New work remains visible after the explicitly ordered work. Pins still work
 * until the student first chooses a custom order for this course. */
export function orderedLibrary<T extends { readonly id: string }>(items: readonly T[], order: readonly string[] | undefined): readonly T[] {
  if (!order) return items;
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity));
}

/** Move selected visible items as a block. Filtered-out work keeps its slots. */
export function moveLibraryItems(all: readonly string[], visible: readonly string[], selected: ReadonlySet<string>, target: string, after: boolean): readonly string[] {
  if (selected.has(target) || !visible.includes(target)) return all;
  const moving = visible.filter(id => selected.has(id));
  if (!moving.length) return all;
  const rest = visible.filter(id => !selected.has(id));
  const index = rest.indexOf(target) + Number(after);
  rest.splice(index, 0, ...moving);
  const visibleSet = new Set(visible);
  let next = 0;
  return all.map(id => visibleSet.has(id) ? rest[next++]! : id);
}
