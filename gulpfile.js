'use strict';

var gulp = require('gulp');
var bower = require('gulp-bower');
var babel = require('gulp-babel');
var del = require('del');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCss = require('gulp-clean-css');
var stylus = require('gulp-stylus');
var runSequence = require('run-sequence');

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('bower', function() {
  return bower();
});

gulp.task('scripts', () => {
  return gulp.src('src/*.js')
    .pipe(babel({
      presets: ['es2015'],
      plugins: ['transform-class-properties']
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function(){
  return gulp.src('src/*.styl')
    .pipe(stylus({errors: true}))
    .pipe(gulp.dest('dist'));
});

gulp.task('uglify', () => {
  return gulp.src('dist/*.js', {base:"dist/"})
    .pipe(uglify({
        preserveComments: 'some',
        report: 'min',
        banner: '/** \n* @license <%= pkg.name %> - v<%= pkg.version %>\n' +
         '* (c) 2016 AllTheRooms https://github.com/alltherooms/angularjs-logarithmic-slider\n' +
         '* License: MIT \n**/\n'
     }))
    .pipe(concat('ng-logslider.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('cssClean', () => {
  return gulp.src('dist/*.css', {base:"dist/"})
    .pipe(cleanCss())
    .pipe(concat('ng-logslider.min.css'))
    .pipe(gulp.dest('dist'));
});

// tasks
gulp.task('build', cb => {
  runSequence(
    ['clean'],
    ['bower'],
    ['scripts', 'styles'],
    // ['uglify', 'cssClean'],
    cb);
});

