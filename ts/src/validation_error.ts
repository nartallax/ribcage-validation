export class ValidationError extends Error {
	public readonly badValue: unknown
	public readonly valuePath: readonly (string | number)[]
	public readonly validatingExpression: string
	public readonly sourceValue: unknown

	constructor(badValue: unknown,
		valuePath: readonly (string | number)[],
		validatingExpression: string,
		sourceValue: unknown,
		rootValueName = "value") {

		const pathStr = rootValueName + valuePath
			.map(x => typeof(x) === "number"
				? "[" + x + "]"
				: x.match(/^[a-zA-Z_][a-zA-Z\\d_]*$/)
					? "." + x
					: "[" + JSON.stringify(x) + "]")
			.join("")
		super("Validation failed: bad value at path " + pathStr + " (of type " + typeof(badValue) + "): failed at expression " + validatingExpression)
		this.badValue = badValue
		this.valuePath = valuePath
		this.validatingExpression = validatingExpression
		this.sourceValue = sourceValue
	}

	withDifferentValueName(name: string): ValidationError {
		return new ValidationError(
			this.badValue,
			this.valuePath,
			this.validatingExpression,
			this.sourceValue,
			name
		)
	}
}