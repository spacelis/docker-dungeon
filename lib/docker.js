var _, byline, th2, streamifier, path, utils, slice$ = [].slice;
_ = require('underscore');
byline = require('byline');
th2 = require('through2');
streamifier = require('streamifier');
path = require('path');
utils = require('./utils');
module.exports = function(){
  var opts, extract, dockerSpec, imageTagger, serverPrefixedTags, imageBuilder, rmImage, pushImage, rmContainer, stopContainer, nonTaggedImages, stoppedContainers, runningContainers;
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
  imageBuilder = function(opt){
    return th2.obj(function(arg$, enc, cb){
      var dockerfile, tags, dir, dockeropts, cache, i$, ref$, len$, tag;
      dockerfile = arg$.dockerfile, tags = arg$.tags;
      if (_.isEmpty(tags)) {
        return;
      }
      dir = path.dirname(path.resolve(dockerfile.path));
      utils.Logging.info("Building " + dir);
      dockeropts = tags.length > 0
        ? ['-t', tags[0]]
        : [];
      cache = deepEq$(opt != null ? opt.cache : void 8, false, '===') ? false : true;
      console.log(opt);
      console.log(cache);
      dockeropts = dockeropts.concat(!cache
        ? ['--no-cache']
        : []);
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
  stopContainer = function(ctnId){
    try {
      utils.Logging.info("Stopping container " + ctnId);
      utils.Shell.exec("docker stop " + ctnId);
    } catch (e$) {}
    return ctnId;
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
  runningContainers = function(){
    return utils.ArrayStream(utils.Shell.exec("docker ps -q --no-trunc")).pipe(th2.obj(function(ch, enc, cb){
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
    stoppedContainers: stoppedContainers,
    runningContainers: runningContainers,
    stopContainer: stopContainer
  };
}();
function deepEq$(x, y, type){
  var toString = {}.toString, hasOwnProperty = {}.hasOwnProperty,
      has = function (obj, key) { return hasOwnProperty.call(obj, key); };
  var first = true;
  return eq(x, y, []);
  function eq(a, b, stack) {
    var className, length, size, result, alength, blength, r, key, ref, sizeB;
    if (a == null || b == null) { return a === b; }
    if (a.__placeholder__ || b.__placeholder__) { return true; }
    if (a === b) { return a !== 0 || 1 / a == 1 / b; }
    className = toString.call(a);
    if (toString.call(b) != className) { return false; }
    switch (className) {
      case '[object String]': return a == String(b);
      case '[object Number]':
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        return +a == +b;
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') { return false; }
    length = stack.length;
    while (length--) { if (stack[length] == a) { return true; } }
    stack.push(a);
    size = 0;
    result = true;
    if (className == '[object Array]') {
      alength = a.length;
      blength = b.length;
      if (first) {
        switch (type) {
        case '===': result = alength === blength; break;
        case '<==': result = alength <= blength; break;
        case '<<=': result = alength < blength; break;
        }
        size = alength;
        first = false;
      } else {
        result = alength === blength;
        size = alength;
      }
      if (result) {
        while (size--) {
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))){ break; }
        }
      }
    } else {
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
        return false;
      }
      for (key in a) {
        if (has(a, key)) {
          size++;
          if (!(result = has(b, key) && eq(a[key], b[key], stack))) { break; }
        }
      }
      if (result) {
        sizeB = 0;
        for (key in b) {
          if (has(b, key)) { ++sizeB; }
        }
        if (first) {
          if (type === '<<=') {
            result = size < sizeB;
          } else if (type === '<==') {
            result = size <= sizeB
          } else {
            result = size === sizeB;
          }
        } else {
          first = false;
          result = size === sizeB;
        }
      }
    }
    stack.pop();
    return result;
  }
}