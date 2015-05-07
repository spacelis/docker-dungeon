_ = require \underscore
byline = require \byline
th2 = require \through2
streamifier = require \streamifier
path = require \path
shell = require './utils' .Shell
Logging = require './utils' .Logging


module.exports = do ->

  opts = 
    tagptn : "# --TAG:"

  extract = (line) ->
    if (pos = line.indexOf opts.tagptn) >= 0 
    then line.substring(pos + opts.tagptn.length + 1).trim! 
    else ''

  dockerfile-finder = (ptn) ->
    ptn ?= '**/Dockerfile'
    gulp.src(ptn)
      .pipe th2.obj (file, enc, cb) ->
        @push dockerfile: file
        cb!

  /**
  * Find all tags from a given dockerfile
  */
  image-tagger = -> 
    th2.obj (image, enc, cb) !->
      tags = []
      image.dockerfile.contents.toString \utf8 .split('\n')
      |> _.map _, extract
      |> _.filter _, (.length > 0)
      |> _.each _, -> 
        tags.push it
      image.tags = tags
      @push image
      cb!


  image-builder = -> th2.obj ({dockerfile, tags}, enc, cb) !->
    return if _.is-empty tags
    dir = path.dirname path.resolve dockerfile.path
    Logging.info "Building #{dir}"
    dockeropts = tags
    |> _.map _, (tag) -> [\-t, tag]
    |> _.flatten _, true

    shell.launcher \docker, ([\build].concat dockeropts, [\.]),
      cwd: dir
    Logging.info "Finished building #{dir}"
    @push {dockerfile, tags}
    cb!


  rm-image = (tag) ->
    try
      if tag?.length > 0
        Logging.info "Deleting image #{tag}"
        shell.exec "docker rmi #{tag}"


  non-tagged-image = ->
    shell.exec "docker images -q --no-trunc --filter 'dangling=true'"

  stopped-container = ->
    shell.exec "docker ps -qf 'status=exited' --no-trunc"

  {opts, image-tagger, image-builder, rm-image, non-tagged-image, stopped-container}
