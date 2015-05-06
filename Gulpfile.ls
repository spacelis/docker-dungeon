gulp = require \gulp
mocha = require \gulp-mocha
ls = require \gulp-livescript

gulp.task \compile, ->
  gulp.src 'src/*.ls'
  .pipe ls bare:true
  .pipe gulp.dest 'build'


gulp.task \compile-tests, ->
  gulp.src 'tests/*.ls'
  .pipe ls bare:true
  .pipe gulp.dest 'tests'

gulp.task \test, [\compile, \compile-tests], ->
  gulp.src 'tests/*.js', read: false
  .pipe mocha reporter: \progress
