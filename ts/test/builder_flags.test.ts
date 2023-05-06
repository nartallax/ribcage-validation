import expect from "expect.js"
import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {RCV} from "src/ribcage-validation"

describe("builder flags", () => {

	class Point {}
	const classDef = RC.instance(Point)
	const numberDef = RC.number({default: 10})
	const pointStructDef = RC.struct({x: RC.number(), y: RC.number()})

	test("onClassInstance throw_on_build", () => {
		const builder = RCV.getValidatorBuilder({onClassInstance: "throw_on_build"})
		expect(() => builder.build(classDef)).throwError(/checking of class instances is disabled/)
	})

	test("onClassInstance check_by_instanceof", () => {
		const builder = RCV.getValidatorBuilder({onClassInstance: "check_by_instanceof"})
		const validator = builder.build(classDef)
		expect(() => validator({})).throwError(/bad value/)
		validator(new Point())
	})

	test("onNaNWhenExpectedNumber allow", () => {
		const builder = RCV.getValidatorBuilder({onNaNWhenExpectedNumber: "allow"})
		const validator = builder.build(numberDef)
		validator(NaN)
	})

	test("onNaNWhenExpectedNumber validation_error", () => {
		const builder = RCV.getValidatorBuilder({onNaNWhenExpectedNumber: "validation_error"})
		const validator = builder.build(numberDef)
		expect(() => validator(NaN)).throwError(/bad value/)
	})

	test("onUnknownFieldInObject allow_anything", () => {
		const builder = RCV.getValidatorBuilder({onUnknownFieldInObject: "allow_anything"})
		const validator = builder.build(pointStructDef)
		validator({x: 5, y: 10, z: 15})
	})

	test("onUnknownFieldInObject validation_error", () => {
		const builder = RCV.getValidatorBuilder({onUnknownFieldInObject: "validation_error"})
		const validator = builder.build(pointStructDef)
		expect(() => validator({x: 5, y: 10, z: 15})).throwError(/bad value/)
	})

})