"use strict";

var mdeps = require('module-deps');
var JSONStream = require('JSONStream');
var browserBuiltins = require('browser-builtins');
var path = require('path');
var es = require('event-stream');
var fs = require('fs');
var browserResolve = require('browser-resolve');
var WrapJSStream = require('./WrapJSStream');

function matchPath(filepath, relativeBit) {
	var relativeParts = path.normalize(relativeBit).split(path.sep);
	while (relativeParts[relativeParts.length - 1] === "." || path.basename(filepath) === relativeParts[relativeParts.length - 1]) {
		if (relativeParts.pop() !== '.') {
			filepath = path.dirname(filepath);
		}
	}
	return relativeParts.length === 0 ? filepath : null;
}

var addModuleRelativeName = es.mapSync(function(data) {
	var matchingPackagePath = Object.keys(packagePaths).sort(function(a, b) {
		return b.length - a.length;
	}).filter(function(checkPath) {
		return data.id.substring(0, checkPath.length) === checkPath;
	})[0];

	if (matchingPackagePath !== undefined) {
		data.modRel = packagePaths[matchingPackagePath] + data.id.substring(matchingPackagePath.length);
	} else {
		data.modRel = data.id;
	}
	data.modRel = data.modRel.split(path.sep).join("/").replace(/\.js$/, "");
	return data;
});

var wrap = es.map(function(data, callback) {
	callback(null, "define(" +
			JSON.stringify(data.modRel) +
			", function(require, exports, module) {\n\t" +
			data.source.replace(/\n/g, "\n\t") +
			"\n});\n");
});

var packagePaths = {};
function resolve(id, options, callback) {
	browserResolve(id, options, function(err, pth, pckage) {
		if (pckage !== undefined) {
			var main = "./" + path.normalize(pckage.main || "index.js");
			var match = matchPath(pth, main);
			if (match !== null && packagePaths[match] === undefined) {
				var name = pckage.name || path.basename(match);
				packagePaths[match] = name;
				wrap.write({
					modRel: name,
					source: "module.exports = require(" + JSON.stringify(main.split(path.sep).join("/").replace(/\.js$/, "")) + ");"
				});
			}
		}
		callback(err, pth, pckage);
	});
}

//////////////////////////////////////////////////////////////////////////

var moduleSystemContent = fs.readFileSync(path.join(__dirname, "minimal-browser-modules.js"), { encoding: 'utf8' });

function createBundle(initialModule, options) {
	initialModule = path.resolve(process.cwd(), initialModule);
	options = options || {};

	var withDependencies = typeof options.withDependencies !== 'undefined' ? (options.withDependencies === true) : false;
	var includeSystem = (options.includeSystem === false || options.includeSystem === 'false') ? false : true;
	var moduleName = path.basename(initialModule);

	var wrapJS = new WrapJSStream(";(function() {\n\t" +
			moduleSystemContent.replace(/\n/g, "\n\t") + "\n\n\t", "\n" +
			"\n\tif (typeof module !== 'undefined') {" +
			"\n\t\tmodule.exports = require(" + JSON.stringify(moduleName) + ")" +
			"\n\t} else if (typeof global.define !== 'function') {" +
			"\n\t\tglobal[" + JSON.stringify(moduleName) + "] = require(" + JSON.stringify(moduleName) + ");" +
			"\n\t}" +
			"\n})();");

	var pipeline = es.pipeline(mdeps(initialModule, {
		modules: browserBuiltins,
		resolve: resolve,
		filter: function(moduleId) {
			return withDependencies === true || moduleId.substring(0, 1) === '.';
		}
	}), addModuleRelativeName, wrap);
	if (includeSystem) {
		pipeline = pipeline.pipe(wrapJS);
	}
	pipeline.pipe(process.stdout);
}

if (require.main === module) {
	var args = process.argv.slice(2);

	var options = {};

	for (var i = 0; i < args.length; ++i) {
		var arg = args[i];
		if (arg.substring(0, 1) === '-') {
			var flags = /^-+([^=]+)(=.*)?/.exec(arg);
			options[flags[1]] = flags[2] === undefined ? true : flags[2].substring(1);
		} else {
			createBundle(arg, options);
		}
	}
}

module.exports = createBundle;