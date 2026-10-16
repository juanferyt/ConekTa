export const dateOnly = (value?: string) => value ? value.slice(0, 10) : '';
export const cleanPayload = <T extends Record<string, unknown>>(values: T): Partial<T> => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== undefined)) as Partial<T>;
