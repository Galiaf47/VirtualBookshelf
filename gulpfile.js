var gulp = require('gulp');
var spawn = require('child_process').spawn;
var node;

var source = {
	server: [
		'./app.js',
		'./models/**/*.js',
		'./routes/**/*.js',
		'./security/**/*.js'
	]
};

gulp.task('watchServer', function () {
	gulp.watch(source.server, ['server']);
});

gulp.task('server', function() {
    if (node) node.kill();
    node = spawn('node', ['app.js'], {stdio: 'inherit'});
    node.on('close', function (code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});

gulp.task('default', ['server', 'watchServer']);

// clean up if an error goes unhandled.
process.on('exit', function() {
    if (node) node.kill();
});