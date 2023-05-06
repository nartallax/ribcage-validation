import {RC} from "@nartallax/ribcage"

export function isConstantUnion(type: RC.Any): type is RC.Union {
	if(type.type !== "union"){
		return false
	}

	for(const component of type.components as RC.Any[]){
		if(component.type === "constant"){
			continue
		}
		if(!isConstantUnion(component)){
			return false
		}
	}

	return true
}

export function getConstantUnionValues(type: RC.Any | RC.ObjectFieldType, container: RC.Constantable[] = []): RC.Constantable[] | null {
	if(type.type === "optional" || type.type === "readonly_optional"){
		container.push(undefined)
		return getConstantUnionValues(type.value, container)
	}

	if(type.type === "readonly"){
		return getConstantUnionValues(type.value, container)
	}

	if(type.type !== "union"){
		return null
	}

	for(const component of type.components as RC.Any[]){
		if(component.type === "constant"){
			container.push(component.getValue())
			continue
		}
		const subResult = getConstantUnionValues(component, container)
		if(!subResult){
			return null
		}
	}

	return container
}