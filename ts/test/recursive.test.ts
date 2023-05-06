import {describe, test} from "@nartallax/clamsensor"
import {RC} from "@nartallax/ribcage"
import {expectNoValidationError, expectValidationError} from "test/test_utils"

describe("recursive type validation", () => {
	const linkedList: RC.Any = RC.struct(RC.structFields({
		normal: {value: RC.int()},
		opt: {next: RC.recursive(() => linkedList)}
	}))

	test("should validate linked list", () => {
		expectNoValidationError(linkedList, {value: 5})
		expectNoValidationError(linkedList, {value: 5, next: {value: 10}})
		expectNoValidationError(linkedList, {value: 5, next: {value: 10, next: {value: 0, next: {value: -3}}}})
		expectValidationError(linkedList, {})
		expectValidationError(linkedList, {next: {value: 10, next: {value: 0, next: {value: 3}}}})
		expectValidationError(linkedList, {value: 5, next: {value: 10, next: {next: {value: -3}}}})
		expectValidationError(linkedList, {value: 5, next: {value: 10, next: null}})
	})
})