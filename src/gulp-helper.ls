_ = require \underscore
map = require \through2-map
docker = require './docker'
utils = require './utils'
minimist = require \minimist
path = require \path

module.exports = (gulp) ->

  /** check whether the argument gulp is already wrapped by gulp-help
  */
  if not gulp.tasks.help?.help?
    utils.Logging.warn "[docker-dungeon] Gulp not wrapped with gulp-help, get it wrapped."
    gulp = (require \gulp-help) gulp

  common-tasks : (opts) ->

    if opts?.images?
      all_image = "@(#{ opts.images.join('|') })"
    else
      all_image = "**"


    gulp.task \build, 'Build image for the one or the all images', ->
      argv = minimist process.argv.slice 2
      img = argv.i or all_image
      if _.isArray img
        img = "@(#{ img.join('|') })"
      gulp.src "#{img}/Dockerfile"
        .pipe docker.docker-spec!
        .pipe docker.image-tagger!
        .pipe docker.image-builder!
    

    gulp.task \rmi, 'Clean up untagged images', ->
      docker.non-tagged-images!
        .pipe map.obj (img-id) -> 
          docker.rm-image img-id

    
    gulp.task \clean, 'Remove all built images', ->
      gulp.src "#{img}/Dockerfile"
        .pipe docker.docker-spec!
        .pipe docker.image-tagger!
        .pipe map.obj (img) ->
          _.each img.tags, (tag) ->
            docker.rm-image tag
          img


    gulp.task \push, 'Push all built images to gladys', ->
      argv = process.argv.slice 2
      img = argv.i or all_image
      gulp.src "#{img}/Dockerfile"
        .pipe docker.docker-spec!
        .pipe docker.image-tagger!
        .pipe docker.server-prefixed-tags!
        .pipe map.obj (img) ->
          _.each img.tags, (tag) ->
            docker.push-image tag
          img


    gulp.task \rm, 'Removing all stopped containers', ->
      docker.stopped-containers!
        .pipe map.obj (ctn-id) -> 
          docker.rm-container ctn-id

    gulp.task \stopall, 'Stop all the running containers', ->
      docker.running-containers!
        .pipe map.obj (ctn-id) -> 
          docker.stop-container ctn-id

    gulp.task \bash, 'Equal to `docker exec -it <container> /bin/bash`', ->
      argv = minimist process.argv.slice 2
      container = argv.i
      utils.Shell.interactive-launcher \docker, [ \exec, \-it, "#{path.basename path.resolve '.'}_#{ container }_1".replace(/-/g, ''), '/bin/bash' ]

    gulp.task \info, 'Equal to `docker inspect <container>`', ->
      argv = minimist process.argv.slice 2
      container = argv.i
      utils.Shell.interactive-launcher \docker, [ \inspect, "#{path.basename path.resolve '.'}_#{ container }_1".replace(/-/g, '') ]

  certificate-tasks : ->

    gulp.task \mkcert, 'Make a self-signed certificate for HTTPS connection', ->
      argv = minimist process.argv.slice 2
      keep_tmp = argv.k
      name = argv.n || 'server'
      utils.Shell.interactive-launcher \openssl, [ \genrsa, \-des3, \-passout, 'pass:x', \-out, "#{ name }.pass.key", \2048 ]
      utils.Shell.interactive-launcher \openssl, [ \rsa, \-passin, 'pass:x', \-in, "#{ name }.pass.key", \-out, "#{ name }.key"]
      utils.Shell.interactive-launcher \openssl, [ \req, \-new, \-key, "#{ name }.key", \-out, "#{ name }.csr"]
      utils.Shell.interactive-launcher \openssl, [ \x509, \-req, \-days, \365, \-in, "#{ name }.csr", \-signkey, "#{ name }.key", \-out, "#{ name }.crt"]
      if not keep_tmp
        utils.Shell.interactive-launcher \rm, [ "#{ name }.pass.key", "#{ name }.csr" ]

  doc-tasks : ->

    md = require \gulp-markdown-pdf
    gmdcss = require \generate-github-markdown-css

    gulp.task \githubcss, ->
      gmdcss (err, css) !->
        fs.writeFileSync('./docs/github-markdown.css', css)

    gulp.task \docs, ->
      gulp.src 'docs/*.md'
        .pipe md (
          cssPath: './docs/github-markdown.css',
          paperBorder: '2cm',
          preProcessHtml: -> 
            isFirst = true
            through2 (data, enc, cb) !->
              if isFirst
                @push '<body class="markdown-body">'
                isFirst := false
              # console.log data.toString!
              @push data
              cb!
            , (cb)!->
              @push '</body>'
              cb!
        )
        .pipe gulp.dest 'docs'
