import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("array validation", () => {
	const Ints = RC.array(RC.int())
	test("int array", () => {
		expectNoValidationError(Ints, [1, 2, 3, 4, 5])
		expectValidationError(Ints, [1, 2, 2.5, 3], "value[2]")
		expectValidationError(Ints, [NaN], "value[0]")
		expectValidationError(Ints, NaN)
		expectValidationError(Ints, 5)
		expectValidationError(Ints, {"0": 5})
		expectValidationError(Ints, [1, 2, null, 4], "value[2]")
		expectValidationError(Ints, [1, 2, 3, "uwu"], "value[3]")
		expectNoValidationError(Ints, [])
	})

	const Strings = RC.array(RC.string())
	test("string array", () => {
		expectNoValidationError(Strings, ["uwu", "owo"])
		expectValidationError(Strings, ["uwu", 1], "value[1]")
	})

	const Nulls = RC.roArray(RC.constant(null))
	test("nulls array", () => {
		expectNoValidationError(Nulls, [])
		expectNoValidationError(Nulls, [null, null, null])
		// eslint-disable-next-line no-sparse-arrays
		expectValidationError(Nulls, [null, , null], "value[1]")
		expectValidationError(Nulls, [null, undefined, null], "value[1]")
		expectValidationError(Nulls, [null, false, null], "value[1]")
	})

	const Fives = RC.array(RC.constant(5))
	test("fives array", () => {
		expectNoValidationError(Fives, [5])
		expectNoValidationError(Fives, [])
		expectValidationError(Fives, [6], "value[0]")
	})

	const MaxSumArr = RC.array(RC.number(), {
		validators: [value => value.reduce((a, b) => a + b, 0) < 10]
	})
	test("max sum array", () => {
		expectNoValidationError(MaxSumArr, [])
		expectNoValidationError(MaxSumArr, [1, 1, 1])
		expectValidationError(MaxSumArr, [4, 4, 4])
	})

})