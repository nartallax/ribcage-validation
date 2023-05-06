import {RC} from "@nartallax/ribcage"
import expect from "expect.js"
import {RCV} from "src/ribcage-validation"

export function expectNoValidationError(type: RC.Any, value: unknown): void {
	const builder = RCV.getValidatorBuilder()
	const validator = builder.build(type)
	validator(value)
}

// not all of them, just the most obvious
function escapeSomeRegexChars(str: string): string {
	return str.replace(/[.()[\]\\/]/g, x => "\\" + x)
}

export function expectValidationError(type: RC.Any, value: unknown, err: RegExp | string = "value"): void {
	const builder = RCV.getValidatorBuilder()
	const validator = builder.build(type)
	const checker = err instanceof RegExp ? err : new RegExp(escapeSomeRegexChars(err))
	expect(() => validator(value)).throwError(checker)
}