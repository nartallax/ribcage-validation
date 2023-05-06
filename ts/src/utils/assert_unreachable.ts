export function assertUnreachable(x: never, getMsg?: (x: unknown) => string): never {
	void x
	throw new Error(getMsg ? getMsg(x as unknown) : "Didn't expect to get here")
}