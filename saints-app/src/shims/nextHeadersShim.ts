export const cookies = () => ({
  get: (name: string) => undefined,
  set: (name: string, value: string) => {},
  getAll: () => [],
});
export const headers = () => ({
  get: (name: string) => null,
  entries: () => [],
});
