brjs-webbuild
=============

Creates a bundle suitable for use in the browser or node.  Uses the browserify internals.

This is primarily for situations where you might want to hook into a require/define system that is
already available in the browser, such as is included with BladeRunnerJS.

If you just want to package something generically for the browser, you should use browserify
directly.

You can use it by requiring it from node:

```javascript

    var path = require('path');
    var webbuild = require('brjs-webbuild');

    // these are the defaults
    var options = {
        includeSystem: true,
        withDependencies: false
    }

    var modulePath = path.resolve(process.cwd(), "myModule");

    webbuild(modulePath, options);

```

You can also run it from the command line:

```
    node brjs-webbuild --includeSystem=false myModule
```