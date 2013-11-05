var util = require('util');
var stream = require('stream');

function WrapJSStream(pre, post) {
	this.pre = pre;
	this.started = false;
	this.post = post;
	stream.Transform.call(this, {
		decodeStrings: true
	});
}

util.inherits(WrapJSStream, stream.Transform);

WrapJSStream.prototype._transform = function(chunk, encoding, callback) {
	if (this.started === false) {
		this.started = true;
		if (this.pre !== undefined) {
			this.push(this.pre);
		}
	}
	this.push(chunk.toString().replace(/\n/g, '\n\t'));
	callback();
};
WrapJSStream.prototype._flush = function() {
	if (this.started === true && this.post !== undefined) {
		this.push(this.post);
	}
};

//var ws = new WrapJSStream("define('bob', function() {\n\t", "\n});");
//ws.pipe(process.stdout);
//process.stdin.pipe(ws);

module.exports = WrapJSStream;