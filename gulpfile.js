var gulp = require('gulp');
var ts = require('gulp-typescript');
var del = require('del');

gulp.task('default', () =>
{
	del.sync(['./bin/**/*.*']);
	gulp.src('./src/**/*.ts')
		.pipe(ts({
			noImplicitAny: true,
			outDir: 'bin',
			target: 'ES6',
			module: 'commonjs',
			moduleResolution: 'node'
		}))
		.pipe(gulp.dest('bin/'));
	gulp.src('./src/config.json')
		.pipe(gulp.dest('bin/'));
});
