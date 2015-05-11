var _, byline, th2, streamifier, path, shell, Logging;
_ = require('underscore');
byline = require('byline');
th2 = require('through2');
streamifier = require('streamifier');
path = require('path');
shell = require('./utils').Shell;
Logging = require('./utils').Logging;
module.exports = function(){
  var opts, extract, dockerfileFinder, imageTagger, imageBuilder, rmImage, pushImage, rmContainer, nonTaggedImages, stoppedContainers;
  opts = {
    tagptn: "# --TAG:"
  };
  extract = function(line){
    var pos;
    if ((pos = line.indexOf(opts.tagptn)) >= 0) {
      return line.substring(pos + opts.tagptn.length + 1).trim();
    } else {
      return '';
    }
  };
  dockerfileFinder = function(ptn){
    ptn == null && (ptn = '**/Dockerfile');
    return gulp.src(ptn).pipe(th2.obj(function(file, enc, cb){
      this.push({
        dockerfile: file
      });
      return cb();
    }));
  };
  /**
  * Find all tags from a given dockerfile
  */
  imageTagger = function(){
    return th2.obj(function(image, enc, cb){
      var tags;
      tags = [];
      _.each(_.filter(_.map(image.dockerfile.contents.toString('utf8').split('\n'), extract), function(it){
        return it.length > 0;
      }), function(it){
        return tags.push(it);
      });
      image.tags = tags;
      this.push(image);
      cb();
    });
  };
  imageBuilder = function(){
    return th2.obj(function(arg$, enc, cb){
      var dockerfile, tags, dir, dockeropts;
      dockerfile = arg$.dockerfile, tags = arg$.tags;
      if (_.isEmpty(tags)) {
        return;
      }
      dir = path.dirname(path.resolve(dockerfile.path));
      Logging.info("Building " + dir);
      dockeropts = _.flatten(_.map(tags, function(tag){
        return ['-t', tag];
      }), true);
      shell.launcher('docker', ['build'].concat(dockeropts, ['.']), {
        cwd: dir
      });
      Logging.info("Finished building " + dir);
      this.push({
        dockerfile: dockerfile,
        tags: tags
      });
      cb();
    });
  };
  rmImage = function(tag){
    try {
      if (((tag != null ? tag.length : void 8) != null) > 0) {
        Logging.info("Deleting image " + tag);
        shell.exec("docker rmi " + tag);
      }
    } catch (e$) {}
    return tag;
  };
  pushImage = function(tag){
    try {
      if (((tag != null ? tag.length : void 8) != null) > 0) {
        Logging.info("Pushing image " + tag);
        shell.exec("docker push " + tag);
      }
    } catch (e$) {}
    return tag;
  };
  rmContainer = function(name){
    try {
      if (((name != null ? name.length : void 8) != null) > 0) {
        Logging.info("Deleting container " + name);
        shell.exec("docker rmi " + name);
      }
    } catch (e$) {}
    return name;
  };
  nonTaggedImages = function(){
    return utils.ArrayStream(shell.exec("docker images -q --no-trunc --filter 'dangling=true'"));
  };
  stoppedContainers = function(){
    return utils.ArrayStream(shell.exec("docker ps -qf 'status=exited' --no-trunc"));
  };
  return {
    opts: opts,
    imageTagger: imageTagger,
    imageBuilder: imageBuilder,
    rmImage: rmImage,
    nonTaggedImages: nonTaggedImages,
    stoppedContainers: stoppedContainers
  };
}();