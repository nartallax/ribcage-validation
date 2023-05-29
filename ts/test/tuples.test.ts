import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("tuples validation", () => {
	const tupleA = RC.tuple([RC.number(), RC.string(), RC.bool()])

	test("simple tuple", () => {
		expectNoValidationError(tupleA, [5, "uwu", true])
		expectNoValidationError(tupleA, [0, "", false])
		expectValidationError(tupleA, [0, ""])
		expectValidationError(tupleA, [0])
		expectValidationError(tupleA, [])
		expectValidationError(tupleA, [""])
		expectValidationError(tupleA, ["", 0, false], "value[0]")
		expectValidationError(tupleA, [0, false, ""], "value[1]")
	})

	const tupleWithCustomValidator = RC.tuple([RC.int(), RC.int()], {
		validators: [x => (x[0] + x[1]) % 2 === 0]
	})
	test("simple tuple with custom validation", () => {
		expectNoValidationError(tupleWithCustomValidator, [1, 1])
		expectValidationError(tupleWithCustomValidator, [1])
		expectValidationError(tupleWithCustomValidator, [1, 2])
	})
})