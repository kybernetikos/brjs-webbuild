var global = Function("return this")();

var _define = global.define;
var require = global.require;

if (typeof _define !== 'function' || typeof require !== 'function') {
	function realm(parentRequire) {
		var moduleDefinitions = {}, incompleteExports = {}, moduleExports = {}, modulesFromParent = {};

		function derelativise(context, path) {
			var result = (context === "" || path.charAt(0) !== '.') ? [] : context.split("/");
			var working = path.split("/"), item;
			while (item = working.shift()) {
				if (item === "..") {
					result.pop();
				} else if (item !== ".") {
					result.push(item);
				}
			}
			return result.join("/");
		}

		function define(id, definition) {
			if (id in moduleDefinitions) {
				throw new Error('Module ' + id + ' has already been defined.');
			}
			if (modulesFromParent[id] === true) {
				throw new Error('Module ' + id + ' has already been loaded from a parent realm.');
			}
			moduleDefinitions[id] = definition;
		}

		function require(context, id) {
			id = derelativise(context, id).replace(/\.js$/, "");

			if (moduleExports[id] != null) { return moduleExports[id]; }

			if (incompleteExports[id] != null) {
				// there is a circular dependency, we do the best we can in the circumstances.
				return incompleteExports[id].exports;
			}

			var definition = moduleDefinitions[id];
			if (definition == null) {
				if (parentRequire != null) {
					var result = parentRequire(id);
					modulesFromParent[id] = true;
					return result;
				}
				throw new Error("No definition for module " + id + " has been loaded.");
			}

			var module = { exports: {}, id: id };
			incompleteExports[id] = module;
			try {
				if (typeof definition === 'function') {
					var definitionContext = id.substring(0, id.lastIndexOf("/"));
					var returnValue = definition.call(module, require.bind(null, definitionContext), module.exports, module);
					moduleExports[id] = returnValue || module.exports;
				} else {
					moduleExports[id] = definition;
				}
			} finally {
				delete incompleteExports[id];
			}
			return moduleExports[id];
		}

		return {
			define: define, require: require.bind(null, '')
		};
	}

	var defaultRealm = realm(global.require || function(moduleId) {
		if (global[moduleId]) {
			return global[moduleId];
		}
		throw new Error("No definition for module " + moduleId + " could be found in the global top level.");
	});

	require = defaultRealm.require;
	_define = defaultRealm.define;
}