var gulp = require('gulp');
var ts = require('gulp-typescript');
var source = require('gulp-sourcemaps');
var del = require('del');

gulp.task('default', () =>
{
	del.sync(['./bin/**/*.*']);
	gulp.src('./src/**/*.ts')
		.pipe(source.init())
		.pipe(ts({
			noImplicitAny: true,
			outDir: 'bin',
			target: 'es6',
			module: 'commonjs',
			lib: ['es7'],
			moduleResolution: 'node',
			sourceMap: true
		}))
		.pipe(source.write('../bin/', { sourceRoot: '../src' }))
		.pipe(gulp.dest('bin/'));
	gulp.src('./src/config.json')
		.pipe(gulp.dest('bin/'));
});
