import {RC} from "@nartallax/ribcage"
import {getConstantUnionValues} from "src/utils/constant_unions"

export type DiscriminatedTypePack = DiscriminatedUnionGroup | (RC.Struct | RC.ObjectMap)[]

export interface DiscriminatedUnionGroup {
	// switch(obj[propertyName]){
	propertyName: string

	// case "123": recursion
	mapping: Map<RC.Constantable, DiscriminatedTypePack>

	// default: recursion
	default: DiscriminatedTypePack
}

export function findDiscriminatorsInUnion(types: (RC.Struct | RC.ObjectMap)[]): DiscriminatedTypePack {
	const keys = {} as Record<string, Set<RC.Constantable>>
	for(const obj of types){
		if(obj.type !== "object_map"){
			for(const propName in obj.fields){
				const propType = obj.fields[propName]!
				let values = null as null | readonly RC.Constantable[]
				if(propType.type === "constant"){
					values = [propType.getValue() as RC.Constantable]
				} else {
					const constValues = getConstantUnionValues(propType)
					if(constValues){
						values = constValues
					} else {
						continue
					}
				}

				if(propName in keys){
					for(const value of values){
						keys[propName]!.add(value)
					}
				} else {
					keys[propName] = new Set(values)
				}
			}
		}
	}

	const keyOrder = Object.keys(keys).sort((a, b) => keys[b]!.size - keys[a]!.size)
	const result = groupByDiscriminatorKeys(types, keyOrder)
	return result
}

function groupByDiscriminatorKeys(types: (RC.Struct | RC.ObjectMap)[], keys: string[], i = 0): DiscriminatedTypePack {
	if(keys.length <= i){
		return types
	}

	const pack = groupByDiscriminatorKey(types, keys[i]!)
	if(Array.isArray(pack)){
		return groupByDiscriminatorKeys(pack, keys, i + 1)
	}

	for(const [key, value] of pack.mapping){
		if(Array.isArray(value)){
			pack.mapping.set(key, groupByDiscriminatorKeys(value, keys, i + 1))
		}
	}
	if(Array.isArray(pack.default)){
		pack.default = groupByDiscriminatorKeys(pack.default, keys, i + 1)
	}

	return pack
}

function groupByDiscriminatorKey(types: (RC.Struct | RC.ObjectMap)[], key: string): DiscriminatedTypePack {
	const dflt = [] as (RC.Struct | RC.ObjectMap)[]
	const map = new Map<RC.Constantable, RC.Struct[]>()

	for(const type of types){
		if(type.type === "object_map"){
			dflt.push(type)
			continue
		}
		const propType = type.fields[key]
		if(!propType){
			dflt.push(type)
			continue
		}

		let values = null as null | readonly RC.Constantable[]
		if(propType.type === "constant"){
			values = [propType.value]
		} else {
			const unionValues = getConstantUnionValues(propType)
			if(unionValues){
				values = unionValues
			} else {
				dflt.push(type)
				continue
			}
		}

		for(const value of values){
			let arr = map.get(value)
			if(!arr){
				arr = []
				map.set(value, arr)
			}
			arr.push(type)
		}
	}

	if(map.size === 0){
		return dflt
	} else {
		return {
			propertyName: key,
			mapping: map,
			default: dflt
		}
	}

}