var gulp, _, map, docker, minimist;
gulp = require('gulp');
_ = require('underscore');
map = require('through2-map');
docker = require('./docker');
minimist = require('minimist');
module.exports = function(){
  return {
    commonTasks: function(dirs, opts){
      var all_image;
      if ((opts != null ? opts.images : void 8) != null) {
        all_image = "@(" + opts.images.join('|') + ")";
      } else {
        all_image = "**";
      }
      gulp.task('build', 'Build image for the one or the all images', function(){
        var argv, img;
        argv = process.argv.slice(2);
        img = argv.i || all_image;
        return docker.dockerfileFinder(img + "/Dockerfile").pipe(map(function(d){
          return d.path;
        })).pipe(docker.imageTagger()).pipe(docker.imageBuilder());
      });
      gulp.task('rmi', 'Clean up untagged images', function(){
        return docker.nonTaggedImage().pipe(map(function(img){
          return docker.rmImage(img);
        }));
      });
      gulp.task('clean', 'Remove all built images', function(){
        return docker.dockerfileFinder(all_image + "/Dockerfile").pipe(map(function(d){
          return d.path;
        })).pipe(docker.imageTagger()).pipe(th2(function(arg$, enc, cb){
          var tag;
          tag = arg$.tag;
          docker.rmImage(tag);
          return cb();
        }));
      });
      gulp.task('push', 'Push all built images to gladys', function(){
        var argv, img;
        argv = process.argv.slice(2);
        img = argv.i || all_image;
        return docker.dockerfileFinder(img + "/Dockerfile").pipe(docker.imageTagger()).pipe(th2(function(arg$, enc, cb){
          var tag;
          tag = arg$.tag;
          docker.pushImage(tag);
          return cb();
        }));
      });
      gulp.task('rm', 'Removing all stopped containers', function(){
        return docker.stoppedContainers().pipe(map(function(name){
          return docker.rmContainer(name);
        }));
      });
      return gulp.task('bash', 'Equal to `docker exec -it <container> /bin/bash`', function(){
        var argv, container;
        argv = minimist(process.argv.slice(2));
        container = argv.i;
        return docker.interactiveLauncher('docker', ['exec', '-it', (path.basename(path.resolve('.')) + "_" + container + "_1").replace(/-/g, ''), '/bin/bash']);
      });
    },
    certificate: function(){
      return gulp.task('mkcert', 'Make a self-signed certificate for HTTPS connection', function(){
        docker.interactiveLauncher('openssl', ['genrsa', '-des3', '-passout', 'pass:x', '-out', 'server.pass.key', '2048']);
        docker.interactiveLauncher('openssl', ['rsa', '-passin', 'pass:x', '-in', 'server.pass.key', '-out', 'server.key']);
        docker.interactiveLauncher('rm', ['server.pass.key']);
        docker.interactiveLauncher('openssl', ['req', '-new', '-key', 'server.key', '-out', 'server.csr']);
        return docker.interactiveLauncher('openssl', ['x509', '-req', '-days', '365', '-in', 'server.csr', '-signkey', 'server.key', '-out', 'server.crt']);
      });
    },
    docs: function(){
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
}();