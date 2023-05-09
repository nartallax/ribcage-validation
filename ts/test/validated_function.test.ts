/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {RCV} from "src/ribcage-validation"
import expect from "expect.js"

describe("validated function", () => {

	const sumTwoNumbers = RCV.validatedFunction([RC.number(), RC.number()] as const, (a, b) => a + b)

	test("function checks arguments", () => {
		expect(sumTwoNumbers(2, 2)).to.be(4)
		expect(() => sumTwoNumbers(2, "bebebe" as any)).throwError(/value/)
		expect(() => (sumTwoNumbers as any)(2)).throwError(/length/)
		expect(() => (sumTwoNumbers as any)(2, 3, 4)).throwError(/length/)
		expect(() => (sumTwoNumbers as any)()).throwError(/length/)
		expect(() => (sumTwoNumbers as any)("uwu", 5)).throwError(/ arguments\[0\] /)
		expect(() => (sumTwoNumbers as any)(5, false)).throwError(/ arguments\[1\] /)
	})

	const calcLength = RCV.validatedFunction(
		[RC.struct({x: RC.number(), y: RC.number()})] as const,
		x => Math.sqrt(x.x ** 2 + x.y ** 2)
	)
	test("function check indepth", () => {
		expect(calcLength({x: 3, y: 4})).to.be(5)
		expect(() => (calcLength as any)({x: 3, y: 4, z: 5})).throwError(/ arguments\[0\] /)
		expect(() => (calcLength as any)({x: 3, y: "uwu"})).throwError(/ arguments\[0\].y /)
	})

	test("validation wrapper length", () => {
		expect(sumTwoNumbers.length).to.be(2)
		expect(calcLength.length).to.be(1)
	})
})