# Ribcage-Validation

Validation library based on [Ribcage](https://github.com/nartallax/ribcage)

## Install

```bash
npm install @nartallax/ribcage
npm install @nartallax/ribcage-validation
```

Note that `@nartallax/ribcage` is a peer depencency.

## Use

### Validated functions

The most obvious example will be the validated functions:

```typescript
import {RC} from "@nartallax/ribcage"
import {RCV} from "@nartallax/ribcage-validation"

// define some data structure
let point = RC.struct({x: RC.number(), y: RC.number()})

// create a function that uses this data structure
let distanceBetweenPoints = RCV.validatedFunction([point, point], (a, b) => {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
})

// use this function
distanceBetweenPoints({x: 1, y: 1}, {x: 2, y: 1}) // 1
distanceBetweenPoints({x: 1, y: 1}, "this is not the point" as any) // throws
```

### Manual validator creation

You can also explicitly create validators, if this case doesn't fit your needs:

```typescript
import {RC} from "@nartallax/ribcage"
import {RCV} from "@nartallax/ribcage-validation"

let point = RC.struct({x: RC.number(), y: RC.number()})
let builder = RCV.getValidatorBuilder()
let validator = builder.build(point)

validator({x: 5, y: 10}) // nothing
validator({x: 5, y: "uwu"}) // throws
```

### Custom validators

You can attach custom validators to most types provided by Ribcage:

```typescript
import {RC} from "@nartallax/ribcage"

let positivePoint = RC.struct(
	{x: RC.number(), y: RC.number()},
	{
		validators: [point => point.x >= 0 && point.y >= 0]
	}
)

let builder = RCV.getValidatorBuilder()
let validator = builder.build(point)
validator({x: 5, y: 5}) // no error
validator({x: -1, y: 5}) // error
```
