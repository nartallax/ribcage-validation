import {RC} from "@nartallax/ribcage"
import {assertUnreachable} from "src/utils/assert_unreachable"
import {CodeBuilder} from "src/function_generation/code_builder"
import {CodePart, FunctionBuilder, FunctionCodePart, FunctionParameter} from "src/function_generation/function_builder"
import type {RawValidator, ValidatorBuilderImpl} from "src/validator_builder"
import {ValidatorUtils} from "src/function_generation/validator_utils"
import {DiscriminatedTypePack, findDiscriminatorsInUnion} from "src/utils/discriminated_unions"
import {forEachTerminalTypeInUnionIntersection} from "src/utils/unions_intersections"
import {getConstantUnionValues} from "src/utils/constant_unions"

const reservedNames: ReadonlySet<string> = new Set(["checkResult", "i", "propName", "obj", "tuple", "arr", "value", "intCont", "parentIntCont", "unionElement", "map", "set", "key", "value"])

export function isValidIdentifier(name: string): boolean {
	return !!name.match(/^[a-zA-Z_][a-zA-Z\d_]*$/)
}

// sometimes `context` is not defined inside of functions
// but I want to pass it to function invocations even if it's not present in the enclosing function
// so here I declare "default" value of context
// and now I can instead of `typeof(context) === "undefined"? undefined: context`
// just write `context`, because it will be undefined by default and won't generate error
const codePreamble = "var intCont = undefined"

export class ValidatorFunctionBuilder extends FunctionBuilder {

	private readonly definedFunctionsOfTypes = new Map<RC.Any, FunctionCodePart>()

	constructor(readonly manager: ValidatorBuilderImpl) {
		super()
		this.addParameter("u", ValidatorUtils)
	}

	protected isNameReserved(name: string): boolean {
		return reservedNames.has(name)
	}

	protected partToCode(validator: CodePart, valueCode: string): string {
		if(validator.isExpression){
			return validator.expression(valueCode)
		} else {
			return validator.declarationName + "(" + valueCode + ", intCont)"
		}
	}

	build(type: RC.Any, preventReuse?: boolean): RawValidator {
		const part = this.buildPart(type, preventReuse)
		return this.buildStartingAt(part, "value", codePreamble) as RawValidator
	}

	private buildPart(type: RC.Any, preventReuse?: boolean): CodePart {
		if(preventReuse === undefined){
			// TODO: make set of types that will always make condition validator; inline them always instead of importing functions
			// this should reduce number of functions, make generated code easier to understand and maybe increase performance a little
			preventReuse = false
		}
		if(!preventReuse){
			return this.importFunction(type, this.manager.buildInternal(type))
		}

		return this.buildPartNoCache(type)
	}

	private importFunction(type: RC.Any, fn: (value: unknown) => unknown): CodePart {
		const name = this.makeValidatorFunctionName(type, "value")
		this.reserveIdentifier(name)
		const param = this.addParameter(name, fn)
		return {
			isExpression: false,
			get declaration(): string {
				throw new Error("This function is imported and not supposed to have a declaration")
			},
			declarationName: param.name
		}
	}

	private makeValidatorFunctionName(type: RC.Any, dfltTypeName: string): string {
		return this.getUnusedIdentifier("validate_" + (type.name ?? dfltTypeName))
	}

	private makeDescribeErrorCall(valueCode: string, exprCode: string): string {
		return this.makeDescribeErrorCallWithRawCode(valueCode, JSON.stringify(exprCode))
	}

	private makeDescribeErrorCallWithRawCode(valueCode: string, exprCodeRaw: string): string {
		return `u.err(${valueCode}, ${exprCodeRaw})`
	}

	private getValidatorsCode(type: RC.Any, valueCode: string): string {
		if(type.type === "recursive" || type.type === "constant" || !type.validators){
			return ""
		}

		const invocationsCode = type.validators.map(fn => {
			const param = this.addParameter("user_validator", fn)
			return `!${param.name}(${valueCode})`
		})

		return invocationsCode.length === 0
			? ""
			: invocationsCode.length === 1
				? invocationsCode[0]!
				: "(" + invocationsCode.join(" || ") + ")"
	}

	private getValidatorsIfCode(type: RC.Any, valueCode: string): string {
		const code = this.getValidatorsCode(type, valueCode)
		if(!code){
			return ""
		}
		return `if(${code}){
			return ${this.makeDescribeErrorCall(valueCode, code)}
		}`
	}

	private conditionToExpression(type: RC.Any, condBuilder: (valueCode: string) => string): CodePart {
		return {
			isExpression: true,
			expression: valueCode => {
				let cond = condBuilder(valueCode)
				const validatorCond = this.getValidatorsCode(type, valueCode)
				if(validatorCond){
					cond = `(${cond} || ${validatorCond})`
				}
				return `(${cond} && ${this.makeDescribeErrorCall(valueCode, cond)})`
			}
		}
	}

	private makeLiteralPropertyAccessExpression(base: string, indexLiteralValue: string | number) {
		if(typeof(indexLiteralValue) === "number"){
			base += "[" + indexLiteralValue + "]"
		} else {
			base += (isValidIdentifier(indexLiteralValue) ? "." + indexLiteralValue : "[" + JSON.stringify(indexLiteralValue) + "]")
		}
		return base
	}

	private makeOrTakeFunction(type: RC.Any, dfltFunctionName: string, maker: (builder: CodeBuilder) => void): CodePart {
		const alreadyDefinedFunction = this.definedFunctionsOfTypes.get(type)
		if(alreadyDefinedFunction){
			return alreadyDefinedFunction
		}

		const fnDecl = this.addFunction(this.makeValidatorFunctionName(type, dfltFunctionName))
		this.definedFunctionsOfTypes.set(type, fnDecl)
		const builder = new CodeBuilder()
		builder.append(`function ${fnDecl.declarationName}`)
		maker(builder)
		fnDecl.declaration = builder.getResult()
		return fnDecl
	}

	private buildPartNoCache(type: RC.Any): CodePart {
		switch(type.type){
			case "number": return this.conditionToExpression(type, valueCode => {
				let code = `typeof(${valueCode}) !== "number"`
				if(this.manager.opts.onNaNWhenExpectedNumber === "validation_error"){
					code = `(${code} || Number.isNaN(${valueCode}))`
				}
				return code
			})
			case "int": return this.conditionToExpression(type, valueCode => {
				let code = `typeof(${valueCode}) !== "number" || (${valueCode} % 1) !== 0`
				if(this.manager.opts.onNaNWhenExpectedNumber === "validation_error"){
					code = `(${code} || Number.isNaN(${valueCode}))`
				}
				return code
			})
			case "string": return this.conditionToExpression(type, valueCode => {
				return `typeof(${valueCode}) !== "string"`
			})
			case "bool": return this.conditionToExpression(type, valueCode => {
				return `(${valueCode} !== true && ${valueCode} !== false)`
			})
			case "constant":{
				const valueToCheck = this.constValueToCode(type.value)
				return this.conditionToExpression(type, valueCode => `${valueCode} !== ${valueToCheck}`)
			}
			case "date": return this.conditionToExpression(type, valueCode => {
				return `!(${valueCode} instanceof Date)`
			})
			case "binary": return this.conditionToExpression(type, valueCode => {
				return `!(${valueCode} instanceof Uint8Array)`
			})
			case "class_instance":{
				if(this.manager.opts.onClassInstance === "throw_on_build"){
					throw new Error("Failed to build validator: checking of class instances is disabled; class is " + type.cls)
				}
				const name = type.cls.name.length > 50 ? "cnstructor" : type.cls.name.length
				const param = this.addParameter("cls_" + name, type.cls)
				return this.conditionToExpression(type, valueCode => `!(${valueCode} instanceof ${param.name})`)
			}
			case "intersection": return this.buildIntersectionCheckingCode(type)
			case "union": return this.buildUnionCheckingCode(type)
			case "array": return this.buildArrayCheckingCode(type)
			case "struct": return this.buildStructCheckingCode(type)
			case "object_map": return this.buildObjectMapCheckingCode(type)
			case "tuple": return this.buildTupleCheckingCode(type)
			case "recursive": return this.buildPart(type.getType() as RC.Any)
			case "map": return this.buildMapCheckingCode(type)
			case "set": return this.buildSetCheckingCode(type)
			default:
				return assertUnreachable(type, x => "This type is not supported: " + (x as RC.Unknown).type)
		}
	}

	private constValueToCode(value: RC.Constantable): string {
		if(value === undefined){
			return "void 0"
		} else if(value === null){
			return "null"
		} else if(value === true){
			return "true"
		} else if(value === false){
			return "false"
		} else if(typeof(value) === "string"){
			return JSON.stringify(value)
		} else if(typeof(value) === "number" && value % 1 === 0 && Math.abs(value) - 1 < Number.MAX_SAFE_INTEGER){
			return value + ""
		} else {
			const name = "const_of_" + typeof(value)
			const cval = this.addParameter(name, value)
			return cval.name
		}
	}

	private buildConstantUnionCheckingIf(values: RC.Constantable[], paramName: string): [code: string, allowedValues: FunctionParameter] {
		const set = new Set(values)
		const allowedValues = this.addParameter("allowed_values", set)
		const code = `if(!${allowedValues.name}.has(${paramName})){
			return ${this.makeDescribeErrorCall(paramName, `!Set(${JSON.stringify(values)}).has(${paramName})`)}
		}`
		return [code, allowedValues]
	}

	private buildUnionCheckingCode(type: RC.Union): CodePart {
		// optimization
		const constantUnionValues = getConstantUnionValues(type)
		if(constantUnionValues){
			return this.makeOrTakeFunction(type, "constant_union", builder => {
				const paramName = "unionElement"
				const [ifCode] = this.buildConstantUnionCheckingIf(constantUnionValues, paramName)
				builder.append(`(${paramName}){
					${ifCode}

					${this.getValidatorsIfCode(type, paramName)}

					return false
				}`)
			})
		}

		const structTypes = type.components.filter((type: RC.Any): type is RC.Struct => type.type === "struct")
		const objMapTypes = type.components.filter((type: RC.Any): type is RC.ObjectMap => type.type === "object_map")
		if(structTypes.length < 2){
			// if we have one or less structs - there's no reason to think about discriminated unions
			// so we just pack all conditions together and that's it
			const subtypesCheckingParts = type.components.map(type => this.buildPart(type))
			return this.conditionToExpression(type, valueCode => "("
				+ subtypesCheckingParts.map(part => this.partToCode(part, valueCode)).join(" && ")
				+ ")")
		}

		const discrGroups = findDiscriminatorsInUnion([...structTypes, ...objMapTypes])

		const nonObjTypes = type.components.filter(type => type.type !== "struct")
		return this.makeOrTakeFunction(type, "union", builder => {
			const paramName = "value"
			// here we check object and non-object types separately
			// because object types can form discriminated unions
			const initialCheck = `!u.isTypicalObject(${paramName})`
			builder.append(`(${paramName}, intCont){
				var checkResult

				if(${initialCheck}){
					checkResult = ${nonObjTypes.length < 1 ? this.makeDescribeErrorCall(paramName, initialCheck) : nonObjTypes.map(type => this.partToCode(this.buildPart(type), paramName)).join(" && ")}
					if(checkResult){
						return checkResult
					}
				} else {
					${this.discriminationPackToCode(discrGroups, paramName)}
				}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private discriminationPackToCode(pack: DiscriminatedTypePack, valueCode: string): string {
		if(Array.isArray(pack)){
			return `
				checkResult = ${pack.map(type => this.partToCode(this.buildPart(type), valueCode)).join(" && ")}
				if(checkResult){
					return checkResult
				}
			`
		}

		const cases = [...pack.mapping].map(([value, subpack]) => `
			case ${this.constValueToCode(value)}: {
				${this.discriminationPackToCode(subpack, valueCode)}
				break
			}
		`).join("\n")

		const dflt = Array.isArray(pack.default) && pack.default.length < 1
			? "return " + this.makeDescribeErrorCall(
				valueCode,
				"!allowedConstantUnionValues.has(" + this.makeLiteralPropertyAccessExpression(valueCode, pack.propertyName) + ")"
			)
			: `{
				${this.discriminationPackToCode(pack.default, valueCode)}
				break
			}`

		return `switch(${this.makeLiteralPropertyAccessExpression(valueCode, pack.propertyName)}){
			${cases}
			default: ${dflt}
		}`
	}

	private buildIntersectionCheckingCode(type: RC.Intersection<RC.Any>): CodePart {
		const subtypesCheckingParts = type.components.map(type => {
			// we need to inline union checking code to properly pass intersection context
			const forceInline = type.type === "union"
			return this.buildPart(type, forceInline)
		})

		const objectTypes: RC.Struct[] = []
		forEachTerminalTypeInUnionIntersection(type, type => {
			if(type.type === "struct"){
				objectTypes.push(type)
			}
		})

		if(objectTypes.length === 0){
			return this.conditionToExpression(type, valueCode => "("
			+ subtypesCheckingParts.map(part => this.partToCode(part, valueCode)).join(" || ")
			+ ")")
		}

		return this.makeOrTakeFunction(type, "intersection", builder => {
			const paramName = "value"

			const subtypesCheckingCode = subtypesCheckingParts
				.map(part => this.partToCode(part, paramName))
				.join(" || ")

			const allowExtraFields = this.manager.opts.onUnknownFieldInObject === "allow_anything"

			builder.append(`(${paramName}, parentIntCont){
				${allowExtraFields ? "" : "var intCont = u.makeIntCont()"}
				var checkResult = ${subtypesCheckingCode}
				if(checkResult){
					return checkResult
				}
				${allowExtraFields ? "" : `
					if(parentIntCont === undefined){
						checkResult = intCont.check()
						if(checkResult){
							return checkResult
						}
					} else {
						parentIntCont.merge(intCont)
					}
				`}

				${this.getValidatorsIfCode(type, paramName)}
	
				return false
			}`)
		})
	}

	private buildArrayCheckingCode(type: RC.Array | RC.RoArray): CodePart {
		return this.makeOrTakeFunction(type, "array", builder => {
			const paramName = "arr"
			const initialCheck = `!Array.isArray(${paramName})`
			builder.append(`(${paramName}){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				var len = ${paramName}.length
				var checkResult
				for(var i = 0; i < len; i++){
					checkResult = ${this.partToCode(this.buildPart(type.valueType), paramName + "[i]")}
					if(checkResult){
						checkResult.path.push(i)
						return checkResult
					}
				}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private buildTupleCheckingCode(type: RC.Tuple): CodePart {
		return this.makeOrTakeFunction(type, "tuple", builder => {
			const paramName = "tuple"

			const fixedCheckersCode = [] as string[]
			const propConds = [] as CodePart[]

			const makeFixedChecker = (index: number, propType: RC.Any, fromTail = false): void => {
				const propCond = this.buildPart(propType)
				propConds.push(propCond)
				const indexCode = fromTail ? paramName + ".length - " + index : (index + "")
				const code = `
					checkResult = ${this.partToCode(propCond, paramName + "[" + indexCode + "]")}
					if(checkResult){
						checkResult.path.push(${indexCode})
						return checkResult
					}`
				fixedCheckersCode.push(code)
			}

			for(let i = 0; i < type.components.length; i++){
				makeFixedChecker(i, type.components[i]!)
			}

			const initialCheck = `!Array.isArray(${paramName})`
			const lenCheck = `${paramName}.length !== ${type.components.length}`

			builder.append(`(${paramName}){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				if(${lenCheck}){
					return ${this.makeDescribeErrorCall(paramName, lenCheck)}
				}

				var checkResult
				${fixedCheckersCode.join("\n")}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private buildObjectMapCheckingCode(type: RC.ObjectMap): CodePart {
		return this.makeOrTakeFunction(type, "object_map", builder => {
			const paramName = "object_map"

			const constUnionKeys = getConstantUnionValues(type.key)
			const initialCheck = `!u.isTypicalObject(${paramName})`
			const [keyUnionIf, keyUnionSetParam] = !constUnionKeys
				? ["", null]
				: this.buildConstantUnionCheckingIf(constUnionKeys, "propName")
			builder.append(`(${paramName}, intCont){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				var checkResult
				
				for(var propName ${keyUnionSetParam ? "of " + keyUnionSetParam.name : "in " + paramName}){
					checkResult = ${this.partToCode(this.buildPart(type.value), paramName + "[propName]")}
					if(checkResult){
						checkResult.path.push(propName)
						return checkResult
					}
					${keyUnionIf}
				}

				${!keyUnionSetParam || this.manager.opts.onUnknownFieldInObject === "allow_anything" ? "" : `
					if(intCont){
						${`
							for(var i of ${keyUnionSetParam.name}){
								intCont.add(${paramName}, i)
							}
						`}
					} else {
						checkResult = u.checkNoExtraFields(${paramName}, ${keyUnionSetParam.name})
						if(checkResult){
							return checkResult
						}
					}
				`}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private buildStructCheckingCode(type: RC.Struct): CodePart {
		return this.makeOrTakeFunction(type, "struct", builder => {
			const paramName = "struct"

			const fields = Object.entries(type.fields).sort()
			const fieldSetParam = this.addParameter("known_fields", new Set(fields.map(([name]) => name)))

			const initialCheck = `!u.isTypicalObject(${paramName})`
			builder.append(`(${paramName}, intCont){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				var checkResult
				${fields.map(([key, type]) => `
					checkResult = ${this.partToCode(this.buildObjectFieldCheckingCode(type), this.makeLiteralPropertyAccessExpression(paramName, key))}
					if(checkResult){
						checkResult.path.push(${JSON.stringify(key)})
						return checkResult
					}
				`).join("\n")}

				${this.manager.opts.onUnknownFieldInObject === "allow_anything" ? "" : `
					if(intCont){
						${`
							for(var i of ${fieldSetParam.name}){
								intCont.add(${paramName}, i)
							}
						`}
					} else {
						checkResult = u.checkNoExtraFields(${paramName}, ${fieldSetParam.name})
						if(checkResult){
							return checkResult
						}
					}
				`}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private buildObjectFieldCheckingCode(field: RC.ObjectFieldType): CodePart {
		switch(field.type){
			case "optional":
			case "readonly_optional": {
				const valuePart = this.buildPart(field.value)
				return this.conditionToExpression(field.value, valueCode => {
					return `(${valueCode} !== undefined && ${this.partToCode(valuePart, valueCode)})`
				})
			}
			case "readonly":
				return this.buildPart(field.value)
			default:
				return this.buildPart(field)

		}
	}

	private buildMapCheckingCode(type: RC.Map): CodePart {
		return this.makeOrTakeFunction(type, "map", builder => {
			const paramName = "map"
			const initialCheck = `!(${paramName} instanceof Map)`
			builder.append(`(${paramName}){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				var checkResult
				for(var [key, value] of ${paramName}){
					checkResult = ${this.partToCode(this.buildPart(type.key), "key")}
					if(checkResult){
						checkResult.path.push(u.anythingToString(key) + " (as key)")
						return checkResult
					}

					checkResult = ${this.partToCode(this.buildPart(type.value), "value")}
					if(checkResult){
						checkResult.path.push(u.anythingToString(key))
						return checkResult
					}
				}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

	private buildSetCheckingCode(type: RC.Set): CodePart {
		return this.makeOrTakeFunction(type, "set", builder => {
			const paramName = "set"
			const initialCheck = `!(${paramName} instanceof Set)`
			builder.append(`(${paramName}){
				if(${initialCheck}){
					return ${this.makeDescribeErrorCall(paramName, initialCheck)}
				}

				var checkResult
				for(var value of ${paramName}){
					checkResult = ${this.partToCode(this.buildPart(type.value), "value")}
					if(checkResult){
						return checkResult
					}
				}

				${this.getValidatorsIfCode(type, paramName)}

				return false
			}`)
		})
	}

}