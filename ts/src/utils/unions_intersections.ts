import {RC} from "@nartallax/ribcage"

export function forEachTerminalTypeInUnion(type: RC.Any, handler: (type: RC.Any) => void): void {
	if(type.type === "union"){
		type.components.forEach(subtype => forEachTerminalTypeInUnion(subtype, handler))
	} else {
		handler(type)
	}
}

export function forEachTerminalTypeInUnionIntersection(type: RC.Any, handler: (type: RC.Any) => void): void {
	if(type.type === "union" || type.type === "intersection"){
		type.components.forEach(subtype => forEachTerminalTypeInUnionIntersection(subtype, handler))
	} else {
		handler(type)
	}
}