import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("primitive type validators", () => {
	const num = RC.number()
	test("number", () => {
		expectNoValidationError(num, 5)
		expectNoValidationError(num, 5.5)
		expectNoValidationError(num, -5.5)
		expectValidationError(num, NaN)
		expectValidationError(num, null)
		expectValidationError(num, "uwu")
	})

	const OddNumber = RC.number({validators: [value => value % 2 === 1]})
	test("odd number", () => {
		expectNoValidationError(OddNumber, 5)
		expectValidationError(OddNumber, 2)
		expectValidationError(OddNumber, "uwu")
	})

	const NaturalNumber = RC.number({validators: [
		value => value % 1 === 0,
		value => value > 0 // equals...? idk. whatever.
	]})
	test("natural number", () => {
		expectNoValidationError(NaturalNumber, 3)
		expectValidationError(NaturalNumber, 3.5)
		expectValidationError(NaturalNumber, -3)
		expectValidationError(NaturalNumber, -3.5)
	})

	const str = RC.string()
	test("string", () => {
		expectNoValidationError(str, "")
		expectNoValidationError(str, "uwu")
		expectNoValidationError(str, "0")
		expectValidationError(str, 0)
		expectValidationError(str, null)
		expectValidationError(str, {})
	})

	const ThreeLetterString = RC.string({validators: [value => value.length === 3]})
	test("three letter string", () => {
		expectNoValidationError(ThreeLetterString, "nya")
		expectValidationError(ThreeLetterString, "ayaya")
	})

	const bool = RC.bool()
	test("boolean", () => {
		expectNoValidationError(bool, false)
		expectNoValidationError(bool, true)
		expectValidationError(bool, 0)
		expectValidationError(bool, 1)
		expectValidationError(bool, null)
		expectValidationError(bool, undefined)
		expectValidationError(bool, "")
		expectValidationError(bool, "uwu")
	})
})