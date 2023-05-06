import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("map validation", () => {
	const myMap = RC.map({
		key: RC.struct({x: RC.number(), y: RC.number()}),
		value: RC.array(RC.number())
	})

	test("validates simple map", () => {
		expectNoValidationError(myMap, new Map())
		expectNoValidationError(myMap, new Map([[{x: 5, y: 10}, []]]))
		expectNoValidationError(myMap, new Map([[{x: 5, y: 10}, [1, 2, 3]]]))
		expectValidationError(myMap, new Map([[{x: 5, y: 10, z: 15}, [1, 2, 3]]]))
		expectValidationError(myMap, new Map([[{x: 5, y: 10}, [1, 2, "3"]]]))
	})

	const mapWithValidator = RC.map({
		key: RC.string(),
		value: RC.number(),
		validators: [map => ![...map].find(([key, value]) => key !== value + "")]
	})
	test("validates map with custom validator", () => {
		expectNoValidationError(mapWithValidator, new Map())
		expectNoValidationError(mapWithValidator, new Map([["5", 5]]))
		expectValidationError(mapWithValidator, new Map([["5", 6]]))
	})
})