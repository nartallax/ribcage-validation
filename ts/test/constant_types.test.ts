import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("constant types validation", () => {
	const myFalse = RC.constant(false as const)
	test("false const", () => {
		expectNoValidationError(myFalse, false)
		expectValidationError(myFalse, true)
		expectValidationError(myFalse, null)
		expectValidationError(myFalse, undefined)
	})

	const myNull = RC.constant(null)
	test("null const", () => {
		expectNoValidationError(myNull, null)
		expectValidationError(myNull, undefined)
		expectValidationError(myNull, 0)
	})

	const myUndefined = RC.constant(undefined)
	test("undefined const", () => {
		expectNoValidationError(myUndefined, undefined)
		expectValidationError(myUndefined, null)
	})

	const answerToEverything = RC.constant(42 as const)
	test("42 const", () => {
		expectNoValidationError(answerToEverything, 42)
		expectValidationError(answerToEverything, 43)
	})

	const myDogName = RC.constant("I have\" \\ no dog!")
	test("dog name const", () => {
		expectNoValidationError(myDogName, "I have\" \\ no dog!")
		expectValidationError(myDogName, "I have no dog!")
	})

	const goodness = RC.union([
		RC.constant("very_good"),
		RC.constant("moderately_good"),
		RC.constant("0")
	])
	test("string const union", () => {
		expectNoValidationError(goodness, "very_good")
		expectValidationError(goodness, "uwu")
		expectValidationError(goodness, 0)
	})

	const nestedUnions = RC.union([
		RC.constant(1 as const),
		RC.constant(2 as const),
		RC.union([
			RC.constant(3 as const),
			RC.constant(4 as const)
		])
	])
	test("nested const union", () => {
		expectNoValidationError(nestedUnions, 1)
		expectNoValidationError(nestedUnions, 4)
		expectValidationError(nestedUnions, 5)
	})

	const quality = RC.union([
		myNull,
		myFalse,
		RC.constant(1 as const),
		RC.constant(2 as const),
		RC.constant(3 as const),
		RC.constant("absolutely perfect" as const)
	])
	test("mixed constant union", () => {
		expectNoValidationError(quality, 2)
		expectNoValidationError(quality, "absolutely perfect")
		expectNoValidationError(quality, false)
		expectNoValidationError(quality, null)
		expectValidationError(quality, 6)
		expectValidationError(quality, true)
	})
})