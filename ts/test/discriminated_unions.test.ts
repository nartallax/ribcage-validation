import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("discriminated unions validation", () => {
	const unionA = RC.union([
		RC.struct({type: RC.constant(1 as const), a: RC.string()}),
		RC.struct({type: RC.constant(2 as const), a: RC.number()}),
		RC.struct({type: RC.constant(3 as const), a: RC.bool()})
	])

	test("simple union", () => {
		expectNoValidationError(unionA, {type: 1, a: "uwu"})
		expectNoValidationError(unionA, {type: 2, a: 12345.6})
		expectNoValidationError(unionA, {type: 3, a: true})
		expectValidationError(unionA, {type: 1, a: 5})
		expectValidationError(unionA, {type: 1, b: 5})
		expectValidationError(unionA, {type: 2, a: "owo"})
		expectValidationError(unionA, {type: 3, a: "owo"})
		expectValidationError(unionA, {type: 3, a: null})
	})

	const unionB = RC.union([
		RC.struct({size: RC.constant(1 as const), b: RC.string()}),
		RC.struct({size: RC.constant(2 as const), b: RC.number()}),
		RC.struct({size: RC.constant(3 as const), b: RC.bool()})
	])
	const unionC = RC.union([
		unionA,
		unionB,
		RC.struct({name: RC.string()})
	])

	test("mixed discriminated unions", () => {
		expectNoValidationError(unionC, {type: 1, a: "nya"})
		expectNoValidationError(unionC, {type: 2, a: 5})
		expectNoValidationError(unionC, {type: 3, a: false})
		expectValidationError(unionC, {type: 4, a: "yuppi"})
		expectNoValidationError(unionC, {size: 1, b: "nya"})
		expectNoValidationError(unionC, {size: 2, b: 5})
		expectNoValidationError(unionC, {size: 3, b: true})
		expectValidationError(unionC, {size: 0, b: 100500})
		expectNoValidationError(unionC, {name: "bubenchik"})
		expectValidationError(unionC, {})
		expectValidationError(unionC, {name: 5})
		expectValidationError(unionC, {size: 1, b: "nya", type: 1, a: "uwu"})
		expectValidationError(unionC, {size: 2, b: 5, a: 5})
		expectValidationError(unionC, {size: 2})
		expectValidationError(unionC, {size: 2, b: "owo"})
		expectValidationError(unionC, {size: 2, b: 5, type: 1})
	})

	const unionD = RC.union([
		RC.union([
			RC.struct({type: RC.constant(1), a: RC.string()}),
			RC.struct({type: RC.constant(2), b: RC.string()}),
			RC.struct({type: RC.constant(3), c: RC.string()})
		]),
		RC.union([
			RC.struct({size: RC.constant(1), d: RC.string()}),
			RC.struct({size: RC.constant(2), e: RC.string()}),
			RC.struct({size: RC.constant(3), f: RC.string()})
		])
	])

	test("mixed discriminated unions with different keys", () => {
		expectNoValidationError(unionD, {type: 1, a: "nya"})
		expectNoValidationError(unionD, {type: 2, b: "nya"})
		expectValidationError(unionD, {type: 2, b: "nya", a: "owo"})
		expectNoValidationError(unionD, {type: 3, c: "nya"})
		expectValidationError(unionD, {type: 4, d: "nya"})
		expectNoValidationError(unionD, {size: 1, d: "nya"})
		expectNoValidationError(unionD, {size: 2, e: "nya"})
		expectNoValidationError(unionD, {size: 3, f: "nya"})
		expectValidationError(unionD, {size: 4, g: "nya"})
		expectValidationError(unionD, {type: 1, a: "nya", size: 1, d: "owo"})
		expectValidationError(unionD, {type: 1, b: "nya"})
		expectValidationError(unionD, {type: 2, b: 5})
		expectValidationError(unionD, {})
		expectValidationError(unionD, {type: 2})
	})

	const unionE = RC.union([
		RC.struct({animal: RC.constant("cat"), breed: RC.constant("siamese"), age: RC.number()}),
		RC.struct({animal: RC.constant("cat"), breed: RC.constant("garfield"), lasagnaLove: RC.number()}),
		RC.struct({animal: RC.constant("cat"), breed: RC.constant("rat"), isHideous: RC.bool()}),
		RC.struct({animal: RC.constant("cat"), fluffLevel: RC.union([
			RC.constant("naked"), RC.constant("short"), RC.constant("long")
		])}),
		RC.struct({breed: RC.constant("goblin"), isGreen: RC.bool()}),
		RC.struct({animal: RC.constant("dog"), breed: RC.constant("beagle"), hasWhiteTail: RC.bool()}),
		RC.struct({animal: RC.constant("dog"), breed: RC.constant("rat"), squeaknessLevel: RC.number()})
	])

	test("wildly mixed discriminated union", () => {
		expectNoValidationError(unionE, {animal: "cat", fluffLevel: "short"})
		expectValidationError(unionE, {animal: "cat", breed: "siamese", fluffLevel: "short"})
		expectNoValidationError(unionE, {animal: "cat", breed: "siamese", age: 5})
		expectValidationError(unionE, {animal: "cat", breed: "garfield", age: 5})
		expectValidationError(unionE, {animal: "cat", breed: "siamese", lasagnaLove: 5})
		expectNoValidationError(unionE, {animal: "cat", breed: "garfield", lasagnaLove: 5})
		expectValidationError(unionE, {breed: "goblin", lasagnaLove: 5})
		expectNoValidationError(unionE, {breed: "goblin", isGreen: true})
		expectValidationError(unionE, {animal: "dog", breed: "goblin", isGreen: true})
		expectValidationError(unionE, {animal: "dog", breed: "rat", hasWhiteTail: true})
		expectNoValidationError(unionE, {animal: "dog", breed: "beagle", hasWhiteTail: true})
		expectNoValidationError(unionE, {animal: "dog", breed: "rat", squeaknessLevel: 100500})
		expectValidationError(unionE, {animal: "dog", breed: "goblin", squeaknessLevel: 100500})
		expectNoValidationError(unionE, {animal: "cat", breed: "rat", isHideous: true})
		expectValidationError(unionE, {animal: "dog", breed: "rat", isHideous: true})
		expectValidationError(unionE, {animal: "cat", breed: "rat", squeaknessLevel: 0})
	})
})