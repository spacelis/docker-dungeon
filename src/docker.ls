_ = require \underscore
byline = require \byline
th2 = require \through2
streamifier = require \streamifier
path = require \path
utils = require './utils'


module.exports = do ->

  opts =
    tagptn : "# --TAG:"

  extract = (line) ->
    if (pos = line.indexOf opts.tagptn) >= 0
    then line.substring(pos + opts.tagptn.length + 1).trim!
    else ''

  docker-spec = ->
    th2.obj (file, enc, cb) ->
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


  server-prefixed-tags = ->
    th2.obj (image, enc, cb) !->
      if image?.tags?.length > 0
        image.tags = _.filter image.tags, (s) -> s.split /\// .length > 2
        @push image
      cb!


  image-builder = (opt) -> th2.obj ({dockerfile, tags}, enc, cb) !->
    return if _.is-empty tags
    dir = path.dirname path.resolve dockerfile.path
    utils.Logging.info "Building #{dir}"
    dockeropts = if tags.length > 0 then ['-t', tags[0]] else []
    cache = if opt?.cache === false then false else true
    dockeropts = dockeropts.concat if not cache then ['--no-cache'] else []

    utils.Shell.launcher \docker, ([\build].concat dockeropts, ['.']),
      cwd: dir
    for tag in tags[1 to]
      utils.Shell.launcher \docker, [\tag, tags[0], tag]

    utils.Logging.info "Finished building #{dir}"
    @push {dockerfile, tags}
    cb!


  rm-image = (tag) ->
    try
      utils.Logging.info "Deleting image #{tag}"
      utils.Shell.exec "docker rmi #{tag}"
    tag

  push-image = (tag) ->
    try
      utils.Logging.info "Pushing image #{tag}"
      utils.Shell.exec "docker push #{tag}"
    tag


  rm-container = (name) ->
    try
      utils.Logging.info "Deleting container #{name}"
      utils.Shell.exec "docker rm -v #{name}"
    name

  stop-container = (ctn-id) ->
    try
      utils.Logging.info "Stopping container #{ctn-id}"
      utils.Shell.exec "docker stop #{ctn-id}"
    ctn-id

  non-tagged-images = ->
    utils.ArrayStream utils.Shell.exec "docker images -q --no-trunc --filter 'dangling=true'"
      .pipe th2.obj (ch, enc, cb) ->
        name = ch.to-string \utf8 .trim!
        if name?.length > 0
          @push name
        cb!

  stopped-containers = ->
    utils.ArrayStream utils.Shell.exec "docker ps -qf 'status=exited' --no-trunc"
      .pipe th2.obj (ch, enc, cb) ->
        name = ch.to-string \utf8 .trim!
        if name?.length > 0
          @push name
        cb!

  running-containers = ->
    utils.ArrayStream utils.Shell.exec "docker ps -q --no-trunc"
      .pipe th2.obj (ch, enc, cb) ->
        name = ch.to-string \utf8 .trim!
        if name?.length > 0
          @push name
        cb!

  {
    opts,
    docker-spec,
    image-tagger,
    image-builder,
    server-prefixed-tags,
    rm-image,
    push-image,
    rm-container,
    non-tagged-images,
    stopped-containers,
    running-containers,
    stop-container
  }
