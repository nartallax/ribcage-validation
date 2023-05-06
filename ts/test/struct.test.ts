import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("struct validation", () => {
	const point = RC.struct({x: RC.int(), y: RC.int()})
	test("point validation", () => {
		expectNoValidationError(point, {x: 5, y: 10})
		expectValidationError(point, {x: 5, y: 10.5}, "value.y")
		expectValidationError(point, {y: 10}, "value.x")
		expectValidationError(point, {x: null, y: 10}, "value.x")
		expectValidationError(point, null)
		expectValidationError(point, {x: 5, y: 10, z: 3})
	})

	const cat = RC.struct(RC.structFields({
		normal: {age: RC.number()},
		roOpt: {name: RC.string()},
		ro: {color: RC.string()},
		opt: {kittenCount: RC.number()}
	}))

	test("optional and readonly field validation", () => {
		expectNoValidationError(cat, {age: 5.5, color: "blue"})
		expectValidationError(cat, {color: "blue"}, "value.age")
		expectValidationError(cat, {age: 5.5}, "value.color")
		expectNoValidationError(cat, {age: 5.5, color: "blue", name: undefined})
		expectNoValidationError(cat, {age: 5.5, color: "blue", name: "fluffy"})
		expectValidationError(cat, {age: 5.5, color: "blue", name: 123}, "value.name")
		expectNoValidationError(cat, {age: 5.5, color: "blue", kittenCount: 0})
		expectNoValidationError(cat, {age: 5.5, color: "blue", kittenCount: undefined})
		expectValidationError(cat, {age: 5.5, color: "blue", kittenCount: null}, "value.kittenCount")
	})

	const order = RC.struct({
		points: RC.array(point),
		startPoint: point,
		endPoint: point
	})

	test("nested structures", () => {
		expectNoValidationError(order, {startPoint: {x: 0, y: 0}, endPoint: {x: 1, y: 1}, points: []})
		expectNoValidationError(order, {startPoint: {x: 0, y: 0}, endPoint: {x: 1, y: 1}, points: [{x: 2, y: 2}, {x: 3, y: 3}]})
		expectValidationError(order, {startPoint: null, endPoint: {x: 1, y: 1}, points: []}, "value.startPoint")
		expectValidationError(order, {endPoint: {x: 1, y: 1}, points: []}, "value.startPoint")
		expectValidationError(order, {startPoint: {x: "uwu", y: 0}, endPoint: {x: 1, y: 1}, points: []}, "value.startPoint.x")
		expectValidationError(order, {startPoint: {x: 0}, endPoint: {x: 1, y: 1}, points: []}, "value.startPoint.y")
		expectValidationError(order, {startPoint: {x: 0, y: null}, endPoint: {x: 1, y: 1}, points: []}, "value.startPoint.y")
		expectValidationError(order, {startPoint: {x: 0, y: 0}, endPoint: {x: 1, y: 1}, points: [{x: 2, y: "uwu"}]}, "value.points[0].y")
		expectValidationError(order, {startPoint: {x: 0, y: 0}, endPoint: {x: 1, y: 1}, points: [{x: 2}]}, "value.points[0].y")
	})

	const NumberBox = RC.struct({
		name: RC.union([RC.constant(null), RC.string()]),
		content: RC.union([RC.constant(null), RC.number()])
	}, {
		validators: [value => {
			if(value.content !== null){
				return value.name !== null
			}
			return true
		}]
	})
	test("number box", () => {
		expectNoValidationError(NumberBox, {content: null, name: null})
		expectNoValidationError(NumberBox, {content: 5, name: "five"})
		expectValidationError(NumberBox, {content: 5, name: null})
		expectValidationError(NumberBox, {content: "five", name: "five"})
	})

	const structWithCustomValidator = RC.struct({x: RC.number(), y: RC.number()}, {
		validators: [point => point.x < 0 === point.y < 0]
	})
	test("struct with custom validator", () => {
		expectNoValidationError(structWithCustomValidator, {x: 5, y: 5})
		expectValidationError(structWithCustomValidator, [5, 5])
		expectValidationError(structWithCustomValidator, {x: 5, y: -5})
		expectNoValidationError(structWithCustomValidator, {x: -5, y: -5})
	})
})