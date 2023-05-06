import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("object map validation", () => {

	const defA = RC.objectMap(RC.number())
	test("string object map", () => {
		expectNoValidationError(defA, {})
		expectNoValidationError(defA, {uwu: 5})
		expectNoValidationError(defA, {owo: -5.4})
		expectValidationError(defA, {owo: "uwu"})
		expectValidationError(defA, ["uwu"])
		expectValidationError(defA, {uwu: null})
	})

	const defB = RC.objectMap(RC.int(), {
		key: RC.union((["a", "b", "c", "d"] as const).map(x => RC.constant(x)))
	})
	test("mapped object map", () => {
		expectValidationError(defB, {})
		expectValidationError(defB, {a: 1, b: 2})
		expectNoValidationError(defB, {a: 1, b: 2, c: 3, d: 4})
		expectValidationError(defB, {a: 1, b: 2, c: 3, d: 4, e: 5})
		expectValidationError(defB, {a: 1, c: 3, d: 4, e: 5})
	})

	const defC = RC.objectMap(RC.int(), {
		validators: [x => !Object.values(x).find(x => x < 0)]
	})
	test("object map with custom validator", () => {
		expectNoValidationError(defC, {})
		expectNoValidationError(defC, {uwu: 5})
		expectValidationError(defC, {uwu: -1})
	})

})