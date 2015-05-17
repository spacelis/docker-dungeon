var _, byline, th2, streamifier, path, utils, slice$ = [].slice;
_ = require('underscore');
byline = require('byline');
th2 = require('through2');
streamifier = require('streamifier');
path = require('path');
utils = require('./utils');
module.exports = function(){
  var opts, extract, dockerSpec, imageTagger, serverPrefixedTags, imageBuilder, rmImage, pushImage, rmContainer, nonTaggedImages, stoppedContainers;
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
  dockerSpec = function(){
    return th2.obj(function(file, enc, cb){
      this.push({
        dockerfile: file
      });
      return cb();
    });
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
  serverPrefixedTags = function(){
    return th2.obj(function(image, enc, cb){
      var ref$;
      if ((image != null ? (ref$ = image.tags) != null ? ref$.length : void 8 : void 8) > 0) {
        image.tags = _.filter(image.tags, function(s){
          return s.split(/\//).length > 2;
        });
        this.push(image);
      }
      cb();
    });
  };
  imageBuilder = function(){
    return th2.obj(function(arg$, enc, cb){
      var dockerfile, tags, dir, dockeropts, i$, ref$, len$, tag;
      dockerfile = arg$.dockerfile, tags = arg$.tags;
      if (_.isEmpty(tags)) {
        return;
      }
      dir = path.dirname(path.resolve(dockerfile.path));
      utils.Logging.info("Building " + dir);
      dockeropts = tags.length > 0
        ? ['-t', tags[0]]
        : [];
      utils.Shell.launcher('docker', ['build'].concat(dockeropts, ['.']), {
        cwd: dir
      });
      for (i$ = 0, len$ = (ref$ = slice$.call(tags, 1)).length; i$ < len$; ++i$) {
        tag = ref$[i$];
        utils.Shell.launcher('docker', ['tag', tags[0], tag]);
      }
      utils.Logging.info("Finished building " + dir);
      this.push({
        dockerfile: dockerfile,
        tags: tags
      });
      cb();
    });
  };
  rmImage = function(tag){
    try {
      utils.Logging.info("Deleting image " + tag);
      utils.Shell.exec("docker rmi " + tag);
    } catch (e$) {}
    return tag;
  };
  pushImage = function(tag){
    try {
      utils.Logging.info("Pushing image " + tag);
      utils.Shell.exec("docker push " + tag);
    } catch (e$) {}
    return tag;
  };
  rmContainer = function(name){
    try {
      utils.Logging.info("Deleting container " + name);
      utils.Shell.exec("docker rm -v " + name);
    } catch (e$) {}
    return name;
  };
  nonTaggedImages = function(){
    return utils.ArrayStream(utils.Shell.exec("docker images -q --no-trunc --filter 'dangling=true'")).pipe(th2.obj(function(ch, enc, cb){
      var name;
      name = ch.toString('utf8').trim();
      if ((name != null ? name.length : void 8) > 0) {
        this.push(name);
      }
      return cb();
    }));
  };
  stoppedContainers = function(){
    return utils.ArrayStream(utils.Shell.exec("docker ps -qf 'status=exited' --no-trunc")).pipe(th2.obj(function(ch, enc, cb){
      var name;
      name = ch.toString('utf8').trim();
      if ((name != null ? name.length : void 8) > 0) {
        this.push(name);
      }
      return cb();
    }));
  };
  return {
    opts: opts,
    dockerSpec: dockerSpec,
    imageTagger: imageTagger,
    imageBuilder: imageBuilder,
    serverPrefixedTags: serverPrefixedTags,
    rmImage: rmImage,
    pushImage: pushImage,
    rmContainer: rmContainer,
    nonTaggedImages: nonTaggedImages,
    stoppedContainers: stoppedContainers
  };
}();