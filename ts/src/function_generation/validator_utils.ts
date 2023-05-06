import type {ErrorValidationResult} from "src/validator_builder"

class IntersectionContext {
	private map = new Map<{[k: string]: unknown}, string[]>()

	add(obj: {[k: string]: unknown}, k: string): void {
		const arr = this.map.get(obj)
		if(!arr){
			this.map.set(obj, [k])
		} else {
			arr.push(k)
		}
	}

	/** Merge other intersection context into this
	 * We can't always use just one context per highest-level intersection
	 * For example, if we have following type:
	 * type T = ({c: number} & {d: number}) | {b: number}
	 * and we validating it agaist following data:
	 * {b: 5, c: 5}
	 * check for "do we have field c" will pass, and field c will be added to intersection context
	 * but check for field d won't pass. So field c must not be in the context
	 * Therefore, we must have one context per each intersection (not only per top-level)
	 * And only if intersection checked correctly as a whole, we can merge this context into parent intersection */
	merge(con: IntersectionContext): void {
		for(const [obj, fieldNames] of con.map){
			const arr = this.map.get(obj)
			if(!arr){
				this.map.set(obj, fieldNames)
			} else {
				arr.push(...fieldNames)
			}
		}
	}

	check(): ErrorValidationResult | null {
		for(const [obj, fieldNames] of this.map){
			if(!ValidatorUtils.isTypicalObject(obj)){
				continue
			}
			const fieldSet = new Set(fieldNames)
			const err = ValidatorUtils.checkNoExtraFields(obj, fieldSet)
			if(err){
				return err
			}
		}
		return null
	}
}

export namespace ValidatorUtils {

	/** Checks if the object is typical object (not null, not instance of some more specific type) */
	export function isTypicalObject(obj: unknown): boolean {
		return typeof(obj) === "object" && obj !== null && (!obj.constructor || obj.constructor === Object)
	}

	export function checkNoExtraFields(obj: {[k: string]: unknown}, fieldSet?: Set<string>): ErrorValidationResult | null {
		// little ugly check, but better than checking each iteration
		if(fieldSet){
			for(const k in obj){
				if(!fieldSet.has(k)){
					return makeAbsentFieldError(obj, k)
				}
			}
		} else {
			for(const k in obj){
				return makeAbsentFieldError(obj, k)
			}
		}
		return null
	}

	function makeAbsentFieldError(obj: unknown, key: string): ErrorValidationResult {
		// we cannot put k in path
		// because in case of deeply nested paths it will point to wrong location
		// better have incomplete path rather than wrong path
		return ValidatorUtils.err(obj, `!(${JSON.stringify(key)} in obj)`)
	}

	export function err(value: unknown, expression: string, lastPathPart?: string): ErrorValidationResult {
		// console.trace(value, expression, lastPathPart)
		const result: ErrorValidationResult = {
			value, expression, path: []
		}
		if(lastPathPart !== undefined){
			result.path.push(lastPathPart)
		}
		return result
	}

	export function makeIntCont(): IntersectionContext {
		return new IntersectionContext()
	}

	export function anythingToString(x: unknown): string {
		if(typeof(x) === "symbol"){
			return x.toString()
		} else {
			return x + ""
		}
	}

}