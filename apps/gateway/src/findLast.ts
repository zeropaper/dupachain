export function findLast<T>(
  array: T[],
  callback: (item: T) => boolean,
): T | undefined {
  for (let i = array.length - 1; i >= 0; i--) {
    if (callback(array[i])) {
      return array[i];
    }
  }
  return undefined;
}
