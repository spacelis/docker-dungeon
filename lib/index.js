module.exports = function(){
  return {
    docker: require('./docker'),
    utils: require('./utils'),
    gulp: require('./gulp-helper')
  };
}();