'use strict';

var gulp = require('gulp');

var argv = require('yargs').argv;
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var del = require('del');
var fs = require('fs');
var path = require('path');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var runSequence = require('run-sequence');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var yuidoc = require('gulp-yuidoc-relative');
var zip = require('gulp-zip');

var rootDir = path.join(__dirname, '..', '..', '..', '..');
var uiDir = path.join(rootDir, 'src', 'ui', 'none');
var pkg = require(path.join(rootDir, 'package.json'));

var apiFolder = path.join(rootDir, 'api');
var distFolder = path.join(rootDir, 'dist');
var editorDistFolder = path.join(distFolder, 'alloy-editor');

var srcFiles = require('../_src.js');

var regexCKEditor = /ckeditor(\\?).js/;

function errorHandler(error) {
    console.log(error.toString());

    this.emit('end');
}

gulp.task('build', function(callback) {
    runSequence(
        'clean-dist',
        'build-js',
        'create-alloy-editor-noui-all',
        'post-cleanup',
        callback
    );
});

gulp.task('release', function(callback) {
    runSequence(
        'clean-dist',
        'build-js',
        'minimize-alloy-editor-noui',
        [
            'create-alloy-editor-noui-all',
            'create-alloy-editor-noui-all-min',
        ],
        'post-cleanup',
        callback
    );
});

gulp.task('clean-dist', function(callback) {
    return del(distFolder, callback);
});

gulp.task('copy-md', function() {
    return gulp.src(path.join(rootDir, '*.md'))
        .pipe(gulp.dest(editorDistFolder));
});

gulp.task('build-js', function(callback) {
    runSequence([
        'copy-ckeditor',
        'create-alloy-editor-noui'
    ], callback);
});

gulp.task('copy-ckeditor', function() {
    return gulp.src(path.join(rootDir, 'lib', 'ckeditor', '/**'))
        .pipe(gulp.dest(editorDistFolder));
});

gulp.task('create-alloy-editor-noui', function() {
    return gulp.src(srcFiles, {cwd : rootDir + '/src'})
    .pipe(babel()).on('error', errorHandler)
    .pipe(concat('alloy-editor-noui.js'))
    .pipe(gulp.dest(editorDistFolder));
});

gulp.task('minimize-alloy-editor-noui', function() {
    return gulp.src([
            path.join(editorDistFolder, 'alloy-editor-noui.js')
        ])
        .pipe(uglify())
        .pipe(rename('alloy-editor-noui-min.js'))
        .pipe(gulp.dest(editorDistFolder));
});

gulp.task('create-alloy-editor-noui-all', function() {
    return gulp.src([
            path.join(editorDistFolder, 'ckeditor.js'),
            path.join(editorDistFolder, 'alloy-editor-noui.js')
        ])
        .pipe(concat('alloy-editor-noui-all.js'))
        .pipe(replace(regexCKEditor, 'alloy-editor-noui-all$1.js'))
        .pipe(gulp.dest(editorDistFolder));
});

gulp.task('create-alloy-editor-noui-all-min', function() {
    return gulp.src([
            path.join(editorDistFolder, 'ckeditor.js'),
            path.join(editorDistFolder, 'alloy-editor-noui-min.js')
        ])
        .pipe(concat('alloy-editor-noui-all-min.js'))
        .pipe(replace(regexCKEditor, 'alloy-editor-noui-all-min$1.js'))
        .pipe(replace(regexReact.CommonJS.regex, regexReact.CommonJS.replace))
        .pipe(replace(regexReact.AMD.regex, regexReact.AMD.replace))
        .pipe(gulp.dest(editorDistFolder));
});

gulp.task('post-cleanup', function(callback) {
    del([
        path.join(editorDistFolder, 'CHANGES.md'),
        path.join(editorDistFolder, 'adapters'),
        path.join(editorDistFolder, 'samples')
    ], callback);
});

gulp.task('watch', ['build'], function () {
    gulp.watch('src/**/*', ['build']);
});
