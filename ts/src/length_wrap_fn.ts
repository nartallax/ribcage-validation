/** Wraps function with another function with set `.length`
 * (you can try setting `.length` on a function manually, but that don't look like a good idea) */
export function lengthWrapFunction<T extends any[], R>(length: number, fn: Fn<T, R>): Fn<T, R> {
	const wrapper = getWrapper(length)
	return wrapper(fn)
}

type Fn<I extends any[] = any[], R = any> = (...args: I) => R

// eslint-disable-next-line @typescript-eslint/ban-types
const wrappers = new Map<number, Fn>()

function getWrapper(length: number): Fn {
	let wrapper = wrappers.get(length)
	if(!wrapper){
		const argNames: string[] = []
		for(let i = 0; i < length; i++){
			argNames.push("_" + i)
		}
		const argNamesStr = argNames.join(", ")
		const sep = length === 0 ? "" : ", "
		wrapper = new Function("baseFn", `return function lengthWrapper${length}(${argNamesStr}${sep}...rest){
			return baseFn(...arguments)
		}`) as Fn
		wrappers.set(length, wrapper)
	}
	return wrapper
}