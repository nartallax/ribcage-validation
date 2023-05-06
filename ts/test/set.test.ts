import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("set validation", () => {
	const mySet = RC.set(RC.number())
	test("validates simple set", () => {
		expectNoValidationError(mySet, new Set())
		expectNoValidationError(mySet, new Set([1, 2, 3]))
		expectValidationError(mySet, new Set("uwu"))
		expectValidationError(mySet, [1, 2, 3])
	})

	const setWithCustomValidation = RC.set(RC.number(), {
		validators: [set => ![...set].find(x => x < 0)]
	})
	test("validates set with custom validators", () => {
		expectNoValidationError(setWithCustomValidation, new Set())
		expectValidationError(setWithCustomValidation, {})
		expectNoValidationError(setWithCustomValidation, new Set([5]))
		expectValidationError(setWithCustomValidation, new Set([-1]))
	})
})