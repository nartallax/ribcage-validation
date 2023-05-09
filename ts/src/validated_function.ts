import {RC} from "@nartallax/ribcage"
import {lengthWrapFunction} from "src/length_wrap_fn"
import {ValidationError} from "src/validation_error"
import {ValidatorBuilder, ValidatorBuilderOptions} from "src/validator_builder"

export interface FunctionArgumentCheckerOptions extends ValidatorBuilderOptions {
	readonly onExtraArguments: "validation_error" | "allow_anything"
}

export function wrapFunctionWithValidator<T extends readonly RC.Any[], R>(types: T, opts: FunctionArgumentCheckerOptions, builder: ValidatorBuilder, handler: (...args: RC.TupleValue<T>) => R): (...args: unknown[]) => R {

	const validators = types.map(type => builder.buildNonThrowing(type))

	return lengthWrapFunction(handler.length, (...args) => {
		if(args.length !== types.length){
			if(opts.onExtraArguments !== "allow_anything"){
				throw new ValidationError(args, [], "arguments.length !== parameters.length", args)
			}
		}

		for(let i = 0; i < args.length; i++){
			const result = validators[i]!(args[i]!)
			if(result){
				throw new ValidationError(
					result.badValue,
					[i, ...result.valuePath],
					result.validatingExpression,
					result.sourceValue,
					"arguments"
				)
			}
		}

		return handler(...args as RC.TupleValue<T>)
	})
}