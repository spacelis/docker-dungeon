var _, byline, th2, streamifier, path, utils;
_ = require('underscore');
byline = require('byline');
th2 = require('through2');
streamifier = require('streamifier');
path = require('path');
utils = require('./utils');
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
      utils.Shell.launcher('docker', ['build'].concat(dockeropts, ['.']), {
        cwd: dir
      });
      utils.Logging.info("Finished building " + dir);
      this.push({
        dockerfile: dockerfile,
        tags: tags
      });
      cb();
    });
  };
  rmImage = function(tag){
    tag = tag.toString('utf8');
    try {
      if (((tag != null ? tag.trim().length : void 8) != null) > 0) {
        utils.Logging.info("Deleting image " + tag);
        utils.Shell.exec("docker rmi " + tag);
      }
    } catch (e$) {}
    return tag;
  };
  pushImage = function(tag){
    tag = tag.toString('utf8');
    try {
      if (((tag != null ? tag.trim().length : void 8) != null) > 0) {
        utils.Logging.info("Pushing image " + tag);
        utils.Shell.exec("docker push " + tag);
      }
    } catch (e$) {}
    return tag;
  };
  rmContainer = function(name){
    name = name.toString('utf8');
    try {
      if (((name != null ? name.trim().length : void 8) != null) > 0) {
        utils.Logging.info("Deleting container " + name);
        utils.Shell.exec("docker rm " + name);
      }
    } catch (e$) {}
    return name;
  };
  nonTaggedImages = function(){
    return utils.ArrayStream(utils.Shell.exec("docker images -q --no-trunc --filter 'dangling=true'"));
  };
  stoppedContainers = function(){
    return utils.ArrayStream(utils.Shell.exec("docker ps -qf 'status=exited' --no-trunc"));
  };
  return {
    opts: opts,
    imageTagger: imageTagger,
    imageBuilder: imageBuilder,
    rmImage: rmImage,
    rmContainer: rmContainer,
    nonTaggedImages: nonTaggedImages,
    stoppedContainers: stoppedContainers
  };
}();