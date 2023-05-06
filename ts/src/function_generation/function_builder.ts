import {deepEquals} from "src/utils/deep_equals"

export type CodePart = ExpressionCodePart | FunctionCodePart

/** Code of validator that is expression
 * This expression is either returns failure information if validation failed, or falsy value if the value is alright */
export interface ExpressionCodePart {
	isExpression: true
	expression(valueName: string): string
}

/** Code of validator that is some function.
 * When said function is invoked, it should act as expression validator (see above) */
export interface FunctionCodePart {
	isExpression: false
	declaration: string
	declarationName: string
}

export interface FunctionParameter {
	readonly name: string
	readonly value: unknown
}

let generatedCounter = 0

/** A class that builds some isolated code and returns result of its execution */
export abstract class FunctionBuilder {

	private readonly parameters = new Map<string, unknown>()
	private readonly functions = new Map<string, FunctionCodePart>()
	private readonly usedIdentifiers = new Set<string>()

	protected abstract isNameReserved(name: string): boolean
	protected abstract partToCode(validator: CodePart, valueCode: string): string

	private isIdentifierInUse(name: string): boolean {
		return this.parameters.has(name) || this.functions.has(name) || this.usedIdentifiers.has(name) || this.isNameReserved(name)
	}

	protected addParameter(suggestedName: string, value: unknown): FunctionParameter {
		let counter = 1
		suggestedName = this.makeIdentifierCodeSafe(suggestedName)
		let name = suggestedName
		while(this.isIdentifierInUse(name)){
			const oldValue = this.parameters.get(name)
			if(deepEquals(oldValue, value)){
				return {name, value}
			} else {
				name = suggestedName + "_" + (counter++)
			}
		}
		this.parameters.set(name, value)
		return {name, value}
	}

	protected getUnusedIdentifier(name: string): string {
		const srcName = this.makeIdentifierCodeSafe(name)
		name = srcName
		let counter = 1
		while(this.isIdentifierInUse(name)){
			name = srcName + "_" + (counter++)
		}
		return name
	}

	protected reserveIdentifier(name: string): void {
		this.usedIdentifiers.add(name)
	}

	protected getAndReserveUnusedIdentifier(name: string): string {
		name = this.getUnusedIdentifier(name)
		this.reserveIdentifier(name)
		return name
	}

	protected addFunction(suggestedName: string, declaration = ""): FunctionCodePart {
		const name = this.getUnusedIdentifier(suggestedName)
		const result: FunctionCodePart = {
			isExpression: false,
			declaration: declaration,
			declarationName: name
		}
		this.functions.set(name, result)
		return result
	}

	private makeIdentifierCodeSafe(base: string): string {
		return base.replace(/</g, "_of_")
			.replace(/[\s>,.:]/g, "_")
			.replace(/[^a-zA-Z\d_]/, "")
			.replace(/_+/g, "_")
			.replace(/^_|_$/g, "")
	}

	protected buildStartingAt(part: CodePart, inputValueIdentifier: string, codePreamble = ""): unknown {
		let code = "\"use strict\";\n" + codePreamble

		const sortedDecls = [...this.functions]
			.sort(([a], [b]) => a > b ? 1 : -1)
			.map(([, decl]) => decl)
		for(const decl of sortedDecls){
			code += "\n\n" + decl.declaration
		}

		const id = ++generatedCounter
		code += "\n\n"
		if(part.isExpression){
			code += `return function validator_entrypoint_${id}(${inputValueIdentifier}){
	return ${this.partToCode(part, inputValueIdentifier)}
}`
		} else {
			code += `return ${part.declarationName}`
		}
		code += `\n//# sourceURL=runtyper_validator_generated_code_${id}`

		// grabbing parameters only after ALL the code is generated
		// otherwise some parameters may still not be defined
		const allValues = [...this.parameters].map(([name, value]) => {
			return {name, value} as FunctionParameter
		}).sort((a, b) => a.name > b.name ? 1 : -1)

		// eslint-disable-next-line @typescript-eslint/ban-types
		let outerFunction: Function
		try {
			outerFunction = new Function(...allValues.map(x => x.name), code)
		} catch(e){
			const msg = e instanceof Error ? e.message : e + ""
			throw new Error("Failed to compile validator: " + msg + "; code is " + code)
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let execResult: any
		try {
			execResult = outerFunction(...allValues.map(x => x.value))
			// console.log(code, allValues.map(x => x.name + " = " + x.value).join("\n") + "\n\n\n\n")
			// console.log(code + "\n===================\n")
		} catch(e){
			const msg = e instanceof Error ? e.message : e + ""
			throw new Error("Failed to execute compiled validator: " + msg + "; code is " + code)
		}
		return execResult
	}

}