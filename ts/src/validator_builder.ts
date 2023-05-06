import {RC} from "@nartallax/ribcage"
import type {RCV} from "src/ribcage-validation"
import {ValidationError} from "src/validation_error"
import {ValidatorFunctionBuilder} from "src/function_generation/validator_function_builder"

export interface ValidatorBuilderOptions {
	readonly onUnknownFieldInObject: "validation_error" | "allow_anything"
	readonly onNaNWhenExpectedNumber: "validation_error" | "allow"
	readonly onClassInstance: "check_by_instanceof" | "throw_on_build"
}

export interface ValidatorBuilder {
	build<T extends RC.Any>(type: T): (value: unknown) => value is RC.Value<T>
	buildNonThrowing(type: RC.Any): (value: unknown) => ValidationError | null
}

export interface ErrorValidationResult {
	value: unknown
	path: (string | number)[]
	expression: string
}

export type RawValidator = (value: unknown) => ErrorValidationResult | null | undefined | false
export type WrappedThrowingValidator<T = unknown> = (value: unknown) => value is T
export type WrappedNonThrowingValidator = (value: unknown) => ValidationError | null

interface ProxyFunctionPair {
	set(realFn: (...args: unknown[]) => unknown): void
	call(...args: unknown[]): unknown
}

/** An aggregator over all validation building process
 * Manages caches, individual validator builders etc */
export class ValidatorBuilderImpl {

	constructor(readonly opts: RCV.ValidatorBuilderOptions) {}

	readonly rawValidators = new Map<RC.Any, RawValidator>()
	readonly currentlyBuildingValidators = new Map<RC.Any, ProxyFunctionPair | null>()
	readonly wrappedThrowingValidators = new Map<RC.Any, WrappedThrowingValidator>()
	readonly wrappedNonThrowingValidators = new Map<RC.Any, WrappedNonThrowingValidator>()

	build<T = unknown>(type: RC.Any): (value: unknown) => value is T {
		return this.buildWrapCached(type, raw => this.wrapThrowing<T>(raw), this.wrappedThrowingValidators) as WrappedThrowingValidator<T>
	}

	buildNonThrowing(type: RC.Any): (value: unknown) => ValidationError | null {
		return this.buildWrapCached(type, raw => this.wrapNonThrowing(raw), this.wrappedNonThrowingValidators)
	}

	private buildWrapCached<T>(type: RC.Any, wrapper: (raw: RawValidator) => T, cache: Map<RC.Any, T>): T {
		const wrapped = cache.get(type)
		if(wrapped){
			return wrapped
		}
		try {
			const raw = this.buildInternal(type)
			const wrapped = wrapper(raw)
			cache.set(type, wrapped)
			return wrapped
		} finally {
			this.clear()
		}
	}

	private clear(): void {
		this.currentlyBuildingValidators.clear()
	}

	private wrapThrowing<T>(rawValidator: RawValidator): WrappedThrowingValidator<T> {
		return function validatorWrapper(value: unknown): value is T {
			const result = rawValidator(value)
			if(!result){
				return true
			} else {
				throw new ValidationError(
					result.value,
					result.path.reverse(),
					result.expression,
					value
				)
			}
		}
	}

	private wrapNonThrowing(rawValidator: RawValidator): WrappedNonThrowingValidator {
		return function validatorWrapper(value: unknown) {
			const result = rawValidator(value)
			if(!result){
				return null
			} else {
				return new ValidationError(
					result.value,
					result.path.reverse(),
					result.expression,
					value
				)
			}
		}
	}

	buildInternal(type: RC.Any): RawValidator {
		const prebuilt = this.rawValidators.get(type)
		if(prebuilt){
			return prebuilt
		}

		if(this.currentlyBuildingValidators.has(type)){
			let proxy = this.currentlyBuildingValidators.get(type)
			if(!proxy){
				proxy = this.makeProxyFunctionPair()
				this.currentlyBuildingValidators.set(type, proxy)
			}
			return proxy.call as unknown as RawValidator
		} else {
			this.currentlyBuildingValidators.set(type, null)
		}

		const result = new ValidatorFunctionBuilder(this).build(type, true)

		const proxy = this.currentlyBuildingValidators.get(type)
		this.currentlyBuildingValidators.delete(type)
		if(proxy){
			proxy.set(result)
		}

		return result
	}

	private makeProxyFunctionPair(): ProxyFunctionPair {
		return new Function(`
			var realFn = null
			var set = fn => { realFn = fn }
			var call = (...args) => realFn(...args)
			return {set, call}
		`)()
	}


}