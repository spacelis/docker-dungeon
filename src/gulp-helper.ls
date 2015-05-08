gulp = require \gulp
_ = require \underscore
map = require \through2-map
docker = require './docker'
minimist = require \minimist

module.exports = do ->
  common-tasks : (dirs, opts) ->

    if opts?.images?
      all_image = "@(#{ opts.images.join('|') })"
    else
      all_image = "**"


    gulp.task 'build', 'Build image for the one or the all images', ->
      argv = process.argv.slice 2
      img = argv.i or all_image
      docker.dockerfile-finder "#{img}/Dockerfile"
        .pipe map (d) -> d.path
        .pipe docker.image-tagger!
        .pipe docker.image-builder!
    

    gulp.task 'rmi', 'Clean up untagged images', ->
      docker.non-tagged-image!
        .pipe map (img) -> docker.rm-image img

    
    gulp.task \clean, 'Remove all built images', ->
      docker.dockerfile-finder "#{ all_image }/Dockerfile"
        .pipe map (d) -> d.path
        .pipe docker.image-tagger!
        .pipe th2 ({tag}, enc, cb) ->
          docker.rm-image tag
          cb!


    gulp.task \push, 'Push all built images to gladys', ->
      argv = process.argv.slice 2
      img = argv.i or all_image
      docker.dockerfile-finder "#{img}/Dockerfile"
        .pipe docker.image-tagger!
        .pipe th2 ({tag}, enc, cb) ->
          docker.push-image tag
          cb!


    gulp.task \rm, 'Removing all stopped containers', ->
      docker.stopped-containers!
        .pipe map (name) -> docker.rm-container name


    gulp.task \bash, 'Equal to `docker exec -it <container> /bin/bash`', ->
      argv = minimist process.argv.slice 2
      container = argv.i
      docker.interactive-launcher \docker, [ \exec, \-it, "#{path.basename path.resolve '.'}_#{ container }_1".replace(/-/g, ''), '/bin/bash' ]


  certificate : ->

    gulp.task \mkcert, 'Make a self-signed certificate for HTTPS connection', ->
      docker.interactive-launcher \openssl, [ \genrsa, \-des3, \-passout, 'pass:x', \-out, 'server.pass.key', \2048 ]
      docker.interactive-launcher \openssl, [ \rsa, \-passin, 'pass:x', \-in, 'server.pass.key', \-out, 'server.key']
      docker.interactive-launcher \rm, [ 'server.pass.key' ]
      docker.interactive-launcher \openssl, [ \req, \-new, \-key, 'server.key', \-out, 'server.csr']
      docker.interactive-launcher \openssl, [ \x509, \-req, \-days, \365, \-in, 'server.csr', \-signkey, 'server.key', \-out, 'server.crt']

  docs : ->

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
