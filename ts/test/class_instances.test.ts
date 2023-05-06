import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("class_instances validation", () => {

	class Dog {
		name = "Sharique"
		bark(): void {
			// nothing
		}
	}

	class Cat {
		walksOnSelf = true
		meow(): void {
			// nothing
		}
	}

	const dogDef = RC.instance(Dog)
	const structDef = RC.struct({firstDog: dogDef, secondDog: dogDef})
	const catOrDogDef = RC.union([dogDef, RC.instance(Cat)])

	test("checks correct instance", () => {
		expectNoValidationError(dogDef, new Dog())
	})

	test("checks incorrect instance", () => {
		expectValidationError(dogDef, new Cat(), "value")
	})

	test("checks class as struct field", () => {
		expectNoValidationError(structDef, {firstDog: new Dog(), secondDog: new Dog()})
	})

	test("can detect absent field", () => {
		expectValidationError(structDef, {firstDog: new Dog()}, "value.secondDog")
	})

	test("can detect lack of prototype", () => {
		expectValidationError(structDef, {
			firstDog: new Dog(),
			secondDog: {name: "Sharique", bark() {/* nothing*/}}
		}, "value.secondDog")
	})

	test("can check class as union member", () => {
		expectNoValidationError(catOrDogDef, new Dog())
		expectNoValidationError(catOrDogDef, new Cat())
		expectValidationError(catOrDogDef, new Set(), "value")
	})

	class Octopus {
		constructor(readonly handsCount: number) {}
	}
	const OctopusDef = RC.instance(Octopus, {validators: [
		value => value.handsCount === 8
	]})
	test("octopus", () => {
		expectNoValidationError(OctopusDef, new Octopus(8))
		expectValidationError(OctopusDef, new Octopus(7))
	})

})