import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("union/intersection types validation", () => {
	const primitive = RC.union([RC.string(), RC.number(), RC.bool()])
	test("primitive types union", () => {
		expectNoValidationError(primitive, "nya")
		expectNoValidationError(primitive, -0.123)
		expectNoValidationError(primitive, false)
		expectValidationError(primitive, NaN)
		expectValidationError(primitive, null)
		expectValidationError(primitive, undefined)
	})

	const zero = RC.union([RC.constant(null), RC.constant(undefined)])
	test("constant types union", () => {
		expectNoValidationError(zero, null)
		expectNoValidationError(zero, undefined)
		expectValidationError(zero, "nya")
		expectValidationError(zero, 0)
		expectValidationError(zero, false)
	})

	const nullableNumber = RC.union([RC.constant(null), RC.number()])
	test("nullable number", () => {
		expectNoValidationError(nullableNumber, 23452.45234)
		expectNoValidationError(nullableNumber, null)
		expectValidationError(nullableNumber, undefined)
	})

	const MathProblem = RC.struct({x: RC.number(), z: RC.number()})
	const Point = RC.struct({x: RC.number(), y: RC.number()})
	const ManyMath = RC.intersection([MathProblem, Point])
	test("simple intersection of structs", () => {
		expectNoValidationError(ManyMath, {x: 5, y: 10, z: 15})
		expectValidationError(ManyMath, {x: 5, y: 10}, "value.z")
		expectValidationError(ManyMath, {x: 5, z: 10}, "value.y")
	})

	const NotManyMath = RC.union([MathProblem, Point])
	test("simple union of structs", () => {
		expectValidationError(NotManyMath, {x: 5, y: 10, z: 15})
		expectNoValidationError(NotManyMath, {x: 5, y: 10})
		expectNoValidationError(NotManyMath, {x: 5, z: 10})
	})

	const UnionOfIntersections = RC.union([
		RC.intersection([
			RC.struct({a: RC.number()}),
			RC.struct({b: RC.number()})
		]),
		RC.intersection([
			RC.struct({c: RC.number()}),
			RC.struct({d: RC.number()})
		])
	])
	test("union of intersection of structs", () => {
		expectNoValidationError(UnionOfIntersections, {b: 5, a: 5})
		expectNoValidationError(UnionOfIntersections, {c: 5, d: 5})
		expectValidationError(UnionOfIntersections, {a: 5, c: 5, d: 5})
		expectValidationError(UnionOfIntersections, {b: 5, c: 5, d: 5})
		expectValidationError(UnionOfIntersections, {a: 5, b: 5, c: 5})
		expectValidationError(UnionOfIntersections, {a: 5, b: 5, d: 5})
	})

	const IntersectionOfUnions = RC.intersection([
		RC.union([
			RC.struct({a: RC.number()}),
			RC.struct({b: RC.number()})
		]),
		RC.union([
			RC.struct({c: RC.number()}),
			RC.struct({d: RC.number()})
		])
	])
	test("intersection of unions of structs", () => {
		expectNoValidationError(IntersectionOfUnions, {b: 5, d: 5})
		expectNoValidationError(IntersectionOfUnions, {a: 5, d: 5})
		expectNoValidationError(IntersectionOfUnions, {a: 5, c: 5})
		expectValidationError(IntersectionOfUnions, {a: 5, b: 5, d: 5})
		expectValidationError(IntersectionOfUnions, {a: 5, c: 5, d: 5})
	})

	const IoUoI = RC.intersection([
		RC.union([
			RC.intersection([
				RC.struct({a: RC.number()}, {name: "struct_a"}),
				RC.struct({b: RC.number()}, {name: "struct_b"})
			], {name: "intersection_ab"}),
			RC.intersection([
				RC.struct({c: RC.number()}, {name: "struct_c"}),
				RC.struct({d: RC.number()}, {name: "struct_d"})
			], {name: "intersection_cd"})
		], {name: "union_abcd"}),
		RC.union([
			RC.intersection([
				RC.struct({e: RC.number()}, {name: "struct_e"}),
				RC.struct({f: RC.number()}, {name: "struct_f"})
			], {name: "intersection_ef"}),
			RC.intersection([
				RC.struct({g: RC.number()}, {name: "struct_g"}),
				RC.struct({h: RC.number()}, {name: "struct_h"})
			], {name: "intersection_gh"})
		], {name: "union_efgh"})
	], {name: "outer_intersection"})
	test("intersection of unions of intersections of structs", () => {
		expectNoValidationError(IoUoI, {a: 5, b: 5, e: 5, f: 5})
		expectNoValidationError(IoUoI, {c: 5, d: 5, g: 5, h: 5})
		expectValidationError(IoUoI, {a: 5, c: 5, e: 5, f: 5})
		expectValidationError(IoUoI, {a: 5, b: 5, e: 5, h: 5})
		expectValidationError(IoUoI, {a: 5, b: 5, e: 5})
		expectValidationError(IoUoI, {b: 5, e: 5, f: 5, h: 5})
	})

	const UoIoU = RC.union([
		RC.intersection([
			RC.union([
				RC.struct({a: RC.number()}),
				RC.struct({b: RC.number()})
			]),
			RC.union([
				RC.struct({c: RC.number()}),
				RC.struct({d: RC.number()})
			])
		]),
		RC.intersection([
			RC.union([
				RC.struct({e: RC.number()}),
				RC.struct({f: RC.number()})
			]),
			RC.union([
				RC.struct({g: RC.number()}),
				RC.struct({h: RC.number()})
			])
		])
	])
	test("union of intersections of unions of structs", () => {
		expectNoValidationError(UoIoU, {a: 5, d: 5})
		expectNoValidationError(UoIoU, {e: 5, h: 5})
		expectValidationError(UoIoU, {a: 5, b: 5, c: 5})
		expectValidationError(UoIoU, {a: 5, d: 5, c: 5})
		expectValidationError(UoIoU, {e: 5, f: 5, h: 5})
	})

	const UnionOfNestedStructs = RC.union([
		RC.struct({a: RC.struct({b: RC.number()})}),
		RC.struct({a: RC.struct({b: RC.string(), c: RC.bool()})})
	])
	test("union of nested structs with different keys", () => {
		expectNoValidationError(UnionOfNestedStructs, {a: {b: 5}})
		expectNoValidationError(UnionOfNestedStructs, {a: {b: "nya", c: false}})
		expectValidationError(UnionOfNestedStructs, {a: {b: "nya"}})
		expectValidationError(UnionOfNestedStructs, {a: {b: null}})
		expectValidationError(UnionOfNestedStructs, {a: null})
		expectValidationError(UnionOfNestedStructs, {a: {b: 5, c: false}})
	})

	const IntersectionOfNestedStructs = RC.intersection([
		RC.struct({a: RC.struct({b: RC.number()})}),
		RC.struct({a: RC.struct({b: RC.number(), c: RC.bool()})})
	])
	test("intersection of nested structs with intersecting keys", () => {
		expectValidationError(IntersectionOfNestedStructs, {a: {b: 5}}, "value.a.c")
		expectValidationError(IntersectionOfNestedStructs, {a: {b: null}}, "value.a.b")
		expectNoValidationError(IntersectionOfNestedStructs, {a: {b: 5, c: false}})
	})

	const InterleavedUnionIntersection = RC.intersection([
		RC.union([
			RC.struct({a: RC.struct({b: RC.number()}), b: RC.struct({b: RC.string()})}),
			RC.struct({a: RC.struct({c: RC.number()}), b: RC.struct({c: RC.string()})})
		]),
		RC.union([
			RC.struct({a: RC.struct({d: RC.number()}), b: RC.struct({d: RC.string()})}),
			RC.struct({a: RC.struct({e: RC.number()}), b: RC.struct({e: RC.string()})})
		])
	])
	test("interleaved union intersection", () => {
		expectNoValidationError(InterleavedUnionIntersection, {a: {b: 5, d: 5}, b: {b: "nya", d: "nya"}})
		expectNoValidationError(InterleavedUnionIntersection, {a: {c: 5, d: 5}, b: {c: "nya", d: "nya"}})
		expectNoValidationError(InterleavedUnionIntersection, {a: {b: 5, e: 5}, b: {b: "nya", e: "nya"}})
		expectValidationError(InterleavedUnionIntersection, {a: {b: 5, d: 5}, b: {c: "nya", d: "nya"}})
		expectValidationError(InterleavedUnionIntersection, {a: {c: 5, e: 5}, b: {c: "nya", d: "nya"}})
		expectValidationError(InterleavedUnionIntersection, {a: {b: 5}, b: {c: "nya", d: "nya"}})
		expectValidationError(InterleavedUnionIntersection, {a: {b: 5}, b: {b: "nya"}})
		expectValidationError(InterleavedUnionIntersection, {a: {b: 5}, b: {c: "nya"}})
	})

	const IntersectionWithUnionField = RC.intersection([
		RC.struct({a: RC.number(), b: RC.union([RC.number(), RC.string()])}),
		RC.struct({b: RC.union([RC.number(), RC.bool()]), c: RC.number()})
	])
	test("intersection with union field", () => {
		expectNoValidationError(IntersectionWithUnionField, {a: 5, b: 5, c: 5})
		expectValidationError(IntersectionWithUnionField, {a: 5, b: "nya", c: 5}, "value.b")
		expectValidationError(IntersectionWithUnionField, {a: 5, b: false, c: 5}, "value.b")
		expectValidationError(IntersectionWithUnionField, {a: 5, c: 5})
	})

	const IntersectionWithNestedUnionField = RC.intersection([
		RC.struct({a: RC.number(), b: RC.struct({d: RC.union([RC.number(), RC.string()])})}),
		RC.struct({b: RC.struct({d: RC.union([RC.number(), RC.bool()])}), c: RC.number()})
	])
	test("intersection with nested union field", () => {
		expectNoValidationError(IntersectionWithNestedUnionField, {a: 5, c: 5, b: {d: 5}})
		expectValidationError(IntersectionWithNestedUnionField, {a: 5, c: 5, b: {d: "owo"}}, "value.b.d")
	})

	const IntersectionWithNestedUnionField2 = RC.intersection([
		RC.struct({a: RC.number(), b: RC.struct({e: RC.union([RC.number(), RC.string()])})}),
		RC.struct({b: RC.struct({d: RC.union([RC.number(), RC.bool()])}), c: RC.number()})
	])
	test("intersection with nested union field 2", () => {
		expectNoValidationError(IntersectionWithNestedUnionField2, {a: 5, c: 5, b: {d: 5, e: "uwu"}})
		expectNoValidationError(IntersectionWithNestedUnionField2, {a: 5, c: 5, b: {d: 5, e: 5}})
		expectNoValidationError(IntersectionWithNestedUnionField2, {a: 5, c: 5, b: {d: false, e: "uwu"}})
		expectValidationError(IntersectionWithNestedUnionField2, {a: 5, c: 5, b: {d: "uwu", e: "uwu"}}, "value.b.d")
		expectValidationError(IntersectionWithNestedUnionField2, {a: 5, c: 5, b: {d: 5, e: false}}, "value.b.e")
	})

	const WrappedOrNonWrappedString = RC.union([
		RC.string(), RC.struct({value: RC.string()}), RC.struct({content: RC.string()})
	])
	test("wrapped or non wrapped string", () => {
		expectNoValidationError(WrappedOrNonWrappedString, "uwu")
		expectNoValidationError(WrappedOrNonWrappedString, {value: "uwu"})
		expectNoValidationError(WrappedOrNonWrappedString, {content: "uwu"})
		expectValidationError(WrappedOrNonWrappedString, {content: "uwu", value: "uwu"})
	})

	const ObjectMapOrNoneStruct = RC.union([
		RC.objectMap(RC.number()),
		RC.struct({none: RC.bool()})
	])
	test("object map or none struct", () => {
		expectNoValidationError(ObjectMapOrNoneStruct, {})
		expectNoValidationError(ObjectMapOrNoneStruct, {none: true})
		expectNoValidationError(ObjectMapOrNoneStruct, {none: 5})
		expectNoValidationError(ObjectMapOrNoneStruct, {owo: 5})
		expectValidationError(ObjectMapOrNoneStruct, {owo: false})
	})

	const ObjectMapOrDiscriminatedUnion = RC.union([
		RC.objectMap(RC.number()),
		RC.struct({type: RC.constant("a" as const), value: RC.bool()}),
		RC.struct({type: RC.constant("b" as const), value: RC.string()})
	])
	test("object map or discriminated union", () => {
		expectNoValidationError(ObjectMapOrDiscriminatedUnion, {type: "a", value: false})
		expectNoValidationError(ObjectMapOrDiscriminatedUnion, {type: "b", value: "uwu"})
		expectNoValidationError(ObjectMapOrDiscriminatedUnion, {a: 5, b: 10})
		expectValidationError(ObjectMapOrDiscriminatedUnion, {type: "a", value: false, a: 5})
		expectValidationError(ObjectMapOrDiscriminatedUnion, {type: "a", value: 5})
		expectValidationError(ObjectMapOrDiscriminatedUnion, {type: "b", value: 5})
		expectValidationError(ObjectMapOrDiscriminatedUnion, {type: "b", value: "uwu", a: 5})
	})

	const SomeAnimal = RC.union([
		RC.struct({type: RC.constant("cat"), meows: RC.bool()}),
		RC.struct({type: RC.constant("dog"), barks: RC.bool()})
	], {
		validators: [value => (value.type === "cat" && value.meows) || (value.type === "dog" && value.barks)]
	})
	test("some animal", () => {
		expectNoValidationError(SomeAnimal, {type: "cat", meows: true})
		expectValidationError(SomeAnimal, {type: "cat", meows: false})
		expectNoValidationError(SomeAnimal, {type: "dog", barks: true})
		expectValidationError(SomeAnimal, {type: "dog", barks: false})
	})

	const WrappedOrNonWrappedStringWithCustomValidator = RC.union([
		RC.string(), RC.struct({value: RC.string()}), RC.struct({content: RC.string()})
	], {
		validators: [value => {
			if(typeof(value) === "string"){
				return value.length === 2
			} else if("value" in value){
				return value.value.length === 3
			}
			return true
		}]
	})
	test("wrapped or non wrapped string with custom validator", () => {
		expectNoValidationError(WrappedOrNonWrappedStringWithCustomValidator, "uw")
		expectValidationError(WrappedOrNonWrappedStringWithCustomValidator, "uwu")
		expectNoValidationError(WrappedOrNonWrappedStringWithCustomValidator, {value: "uwu"})
		expectValidationError(WrappedOrNonWrappedStringWithCustomValidator, {value: "uwuu"})
	})

	const unionWithCustomValidator = RC.union([
		RC.string(), RC.struct({x: RC.number()})
	], {
		validators: [x => typeof(x) === "string" ? x.length < 4 : x.x < 4]
	})
	test("union with custom validator", () => {
		expectNoValidationError(unionWithCustomValidator, {x: 3})
		expectNoValidationError(unionWithCustomValidator, "123")
		expectValidationError(unionWithCustomValidator, {y: 3})
		expectValidationError(unionWithCustomValidator, {x: 4})
		expectValidationError(unionWithCustomValidator, "1234")
	})

})