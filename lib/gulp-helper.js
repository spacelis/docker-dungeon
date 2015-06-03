var _, map, docker, utils, minimist, path;
_ = require('underscore');
map = require('through2-map');
docker = require('./docker');
utils = require('./utils');
minimist = require('minimist');
path = require('path');
module.exports = function(gulp){
  /** check whether the argument gulp is already wrapped by gulp-help
  */
  var ref$;
  if (((ref$ = gulp.tasks.help) != null ? ref$.help : void 8) == null) {
    utils.Logging.warn("[docker-dungeon] Gulp not wrapped with gulp-help, get it wrapped.");
    gulp = require('gulp-help')(gulp);
  }
  return {
    commonTasks: function(opts){
      var all_image;
      if ((opts != null ? opts.images : void 8) != null) {
        all_image = "@(" + opts.images.join('|') + ")";
      } else {
        all_image = "**";
      }
      gulp.task('build', 'Build image for the one or the all images', function(){
        var argv, img;
        argv = minimist(process.argv.slice(2));
        img = argv.i || all_image;
        if (_.isArray(img)) {
          img = "@(" + img.join('|') + ")";
        }
        return gulp.src(img + "/Dockerfile").pipe(docker.dockerSpec()).pipe(docker.imageTagger()).pipe(docker.imageBuilder());
      });
      gulp.task('rmi', 'Clean up untagged images', function(){
        return docker.nonTaggedImages().pipe(map.obj(function(imgId){
          return docker.rmImage(imgId);
        }));
      });
      gulp.task('clean', 'Remove all built images', function(){
        return gulp.src(img + "/Dockerfile").pipe(docker.dockerSpec()).pipe(docker.imageTagger()).pipe(map.obj(function(img){
          _.each(img.tags, function(tag){
            return docker.rmImage(tag);
          });
          return img;
        }));
      });
      gulp.task('push', 'Push all built images to gladys', function(){
        var argv, img;
        argv = process.argv.slice(2);
        img = argv.i || all_image;
        return gulp.src(img + "/Dockerfile").pipe(docker.dockerSpec()).pipe(docker.imageTagger()).pipe(docker.serverPrefixedTags()).pipe(map.obj(function(img){
          _.each(img.tags, function(tag){
            return docker.pushImage(tag);
          });
          return img;
        }));
      });
      gulp.task('rm', 'Removing all stopped containers', function(){
        return docker.stoppedContainers().pipe(map.obj(function(ctnId){
          return docker.rmContainer(ctnId);
        }));
      });
      gulp.task('stopall', 'Stop all the running containers', function(){
        return docker.runningContainers().pipe(map.obj(function(ctnId){
          return docker.stopContainer(ctnId);
        }));
      });
      gulp.task('bash', 'Equal to `docker exec -it <container> /bin/bash`', function(){
        var argv, container;
        argv = minimist(process.argv.slice(2));
        container = argv.i;
        return utils.Shell.interactiveLauncher('docker', ['exec', '-it', (path.basename(path.resolve('.')) + "_" + container + "_1").replace(/-/g, ''), '/bin/bash']);
      });
      return gulp.task('info', 'Equal to `docker inspect <container>`', function(){
        var argv, container;
        argv = minimist(process.argv.slice(2));
        container = argv.i;
        return utils.Shell.interactiveLauncher('docker', ['inspect', (path.basename(path.resolve('.')) + "_" + container + "_1").replace(/-/g, '')]);
      });
    },
    certificateTasks: function(){
      return gulp.task('mkcert', 'Make a self-signed certificate for HTTPS connection', function(){
        var argv, keep_tmp, name;
        argv = minimist(process.argv.slice(2));
        keep_tmp = argv.k;
        name = argv.n || 'server';
        utils.Shell.interactiveLauncher('openssl', ['genrsa', '-des3', '-passout', 'pass:x', '-out', name + ".pass.key", '2048']);
        utils.Shell.interactiveLauncher('openssl', ['rsa', '-passin', 'pass:x', '-in', name + ".pass.key", '-out', name + ".key"]);
        utils.Shell.interactiveLauncher('openssl', ['req', '-new', '-key', name + ".key", '-out', name + ".csr"]);
        utils.Shell.interactiveLauncher('openssl', ['x509', '-req', '-days', '365', '-in', name + ".csr", '-signkey', name + ".key", '-out', name + ".crt"]);
        if (!keep_tmp) {
          return utils.Shell.interactiveLauncher('rm', [name + ".pass.key", name + ".csr"]);
        }
      });
    },
    docTasks: function(){
      var md, gmdcss;
      md = require('gulp-markdown-pdf');
      gmdcss = require('generate-github-markdown-css');
      gulp.task('githubcss', function(){
        return gmdcss(function(err, css){
          fs.writeFileSync('./docs/github-markdown.css', css);
        });
      });
      return gulp.task('docs', function(){
        return gulp.src('docs/*.md').pipe(md({
          cssPath: './docs/github-markdown.css',
          paperBorder: '2cm',
          preProcessHtml: function(){
            var isFirst;
            isFirst = true;
            return through2(function(data, enc, cb){
              if (isFirst) {
                this.push('<body class="markdown-body">');
                isFirst = false;
              }
              this.push(data);
              cb();
            }, function(cb){
              this.push('</body>');
              cb();
            });
          }
        })).pipe(gulp.dest('docs'));
      });
    }
  };
};