gulp = require \gulp
_ = require \underscore
map = require \through2-map
{th2-docker-tags, build-image, rmi-nontagged} = require './docker'
minimist = require \minimist

module.exports = do ->
  common-tasks : (dirs, opts) ->

    all_image = opts?.images or '**'

    gulp.task 'build', 'Build image for the one or the all images', ->
      argv = process.argv.slice 2
      img = argv.i or all_image
      gulp.src "#{img}/Dockerfile"
        .pipe map (d) -> d.path
        .pipe th2-docker-tags!
        .pipe build-image!
    
    gulp.task 'rmi', 'Clean up untagged images', rmi-nontagged

    
    gulp.task \clean, 'Remove all built images associate a dockerfile', ->
      gulp.src "#{ all_image }/Dockerfile"
        .pipe sutils.map (d) -> d.path
        .pipe find-tags!
        .pipe through ({_, tag}) ->
          try
            if tag?.length > 0
              log.info "Deleting image #{tag}"
              exec "docker rmi #{tag}"


    gulp.task \push, 'Push all built images to gladys', ->
      argv = process.argv.slice 2
      img = argv.i or all_image
      gulp.src "#{img}/Dockerfile"
        .pipe sutils.map (d) -> d.path
        .pipe find-tags!
        .pipe through ({_, tag}) ->
          try
            if tag?.length > 0
              log.info "Pushing image #{tag}"
              exec "docker push #{tag}"


    gulp.task \rm, 'Removing all stopped containers', ->
      _.each (exec "docker ps -qf 'status=exited' --no-trunc"), (i) ->
        try
          if i?.length > 0
            log.info "Deleting container #{i}"
            exec "docker rm #{i}"


    gulp.task \bash, 'Equal to `docker exec -it <container> /bin/bash`', ->
      argv = minimist process.argv.slice 2
      container = argv.i
      interactive-launcher \docker, [ \exec, \-it, "#{path.basename path.resolve '.'}_#{ container }_1".replace(/-/g, ''), '/bin/bash' ]

  certificate : ->

    gulp.task \mkcert, 'Make a self-signed certificate for HTTPS connection', ->
      interactive-launcher \openssl, [ \genrsa, \-des3, \-passout, 'pass:x', \-out, 'server.pass.key', \2048 ]
      interactive-launcher \openssl, [ \rsa, \-passin, 'pass:x', \-in, 'server.pass.key', \-out, 'server.key']
      interactive-launcher \rm, [ 'server.pass.key' ]
      interactive-launcher \openssl, [ \req, \-new, \-key, 'server.key', \-out, 'server.csr']
      interactive-launcher \openssl, [ \x509, \-req, \-days, \365, \-in, 'server.csr', \-signkey, 'server.key', \-out, 'server.crt']

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
