import {RC} from "@nartallax/ribcage"
import {wrapFunctionWithValidator, FunctionArgumentCheckerOptions} from "src/validated_function"
import {ValidationError} from "src/validation_error"
import {ValidatorBuilder, ValidatorBuilderOptions, ValidatorBuilderImpl} from "src/validator_builder"

export namespace RCV {

	function getFullValidatorBuilderOpts(opts?: Partial<ValidatorBuilderOptions>): ValidatorBuilderOptions {
		return {
			onUnknownFieldInObject: "validation_error",
			onNaNWhenExpectedNumber: "validation_error",
			onClassInstance: "check_by_instanceof",
			...(opts || {})
		}
	}

	function getFullArgCheckerOpts(opts?: Partial<FunctionArgumentCheckerOptions>): FunctionArgumentCheckerOptions {
		return {
			onExtraArguments: "validation_error",
			...getFullValidatorBuilderOpts(opts)
		}
	}

	const builders = {} as {[k: string]: ValidatorBuilder}
	export function getValidatorBuilder(opts?: Partial<ValidatorBuilderOptions>): ValidatorBuilder {
		const fullOpts = getFullValidatorBuilderOpts(opts)

		const key = Object.keys(fullOpts).sort()
			.map(key => fullOpts[key as keyof ValidatorBuilderOptions])
			.join("|")

		return builders[key] ||= new ValidatorBuilderImpl(fullOpts)
	}

	type ValidatedFunctionHandler<T extends readonly RC.Any[], R> = (...args: RC.TupleValue<T>) => R

	// TODO: const T here
	export function validatedFunction<T extends readonly RC.Any[], R>(types: T, handler: ValidatedFunctionHandler<T, R>): (...args: RC.TupleValue<T>) => R
	export function validatedFunction<T extends readonly RC.Any[], R>(types: T, options: Partial<FunctionArgumentCheckerOptions>, handler: (...args: RC.TupleValue<T>) => R): (...args: RC.TupleValue<T>) => R
	export function validatedFunction<T extends readonly RC.Any[], R>(types: T, a: ValidatedFunctionHandler<T, R> | Partial<FunctionArgumentCheckerOptions>, b?: ValidatedFunctionHandler<T, R>): (...args: RC.TupleValue<T>) => R {
		let opts: FunctionArgumentCheckerOptions
		let handler: ValidatedFunctionHandler<T, R>
		if(b === undefined){
			opts = getFullArgCheckerOpts({})
			handler = a as ValidatedFunctionHandler<T, R>
		} else {
			handler = b
			opts = getFullArgCheckerOpts(a as Partial<FunctionArgumentCheckerOptions>)
		}

		const builder = getValidatorBuilder(opts)
		return wrapFunctionWithValidator(types, opts, builder, handler)
	}

	export type Error = ValidationError
	export const Error = ValidationError
}

/* eslint-disable @typescript-eslint/no-empty-interface */
declare module "@nartallax/ribcage" {
	export namespace RC {
		export interface BaseTypeDefinition {
			/** Name of the type.
			 * Mostly for debugging; will be used as parts of generated function names */
			readonly name?: string
		}

		interface ValidatorsField<T> {
			/** Custom validators.
			 * They are invoked after all built-in validators */
			readonly validators?: readonly ((value: T) => boolean)[]
		}

		export interface StructDefinition<F extends StructFields> extends ValidatorsField<{readonly [k in keyof F]: Value<F[k]>}> {}
		export interface TupleDefinition<T extends readonly Unknown[]> extends ValidatorsField<TupleValue<T>> {}
		export interface UnionDefinition<T extends Unknown> extends ValidatorsField<Value<T>> {}
		export interface ArrayDefinition<V extends Unknown> extends ValidatorsField<readonly Value<V>[]> {}
		export interface BinaryDefinition extends ValidatorsField<Uint8Array> {}
		export interface ClassInstanceDefinition<C> extends ValidatorsField<C>{}
		export interface DateDefinition extends ValidatorsField<NativeDate>{}
		export interface IntersectionDefinition<T extends Unknown> extends ValidatorsField<Value<T>> {}
		export interface MapDefinition<K extends Unknown, V extends Unknown> extends ValidatorsField<NativeMap<Value<K>, Value<V>>> {}
		export interface ObjectMapDefinition<V extends Unknown, K extends ObjectMapKeyType> extends ValidatorsField<ObjectMapValue<K, V>> {}
		export interface StringDefiniton extends ValidatorsField<string> {}
		export interface NumberDefinition extends ValidatorsField<number>{}
		export interface BoolDefinition extends ValidatorsField<boolean>{}
		export interface SetDefinition<T extends Unknown> extends ValidatorsField<NativeSet<Value<T>>>{}

	}
}