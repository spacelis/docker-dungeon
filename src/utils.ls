"use_strict"
chproc = require \child_process
stream = require \stream
_ = require \underscore

module.exports = do ->

  Logging = do ->
    chalk = require \chalk

    info: (msg) ->
      console.log "#{chalk.blue "[INFO]"} #{msg}"

    warn: (msg) ->
      console.log "#{chalk.yellow "[WARN]"} #{msg}"

    err: (msg) ->
      console.log "#{chalk.bgRed "[Error]"} #{msg}"

    ok: (msg) ->
      console.log "#{chalk.white "[OK]"} #{msg}"

    exec: (msg) ->
      console.log "#{chalk.green "[Exec]"} #{msg}"

    debug: (obj) ->
      console.log "#{chalk.black.bgCyan "[Debug]"} #{obj}"
      obj

  Shell = do ->
    /**
    * Executing the comaand and return the output as a list of lines
    */
    exec : (bashcmd, cwd) ->
      cwd ?= '.'
      output = (chproc.execSync "bash -c '#{bashcmd}'", cwd: cwd).toString!.split '\n' ? []
      if output.length is 1 and output[0].trim() is ""
        []
      else
        _.map output, (s) -> s.trim()


    /**
    * Executing the command and redirect the output to the current process
    */
    launcher : (cmd, args, options) ->
      args ?= []
      Logging.exec "[#{options?.cwd ? "."}]: #{cmd} #{ args?.join ' ' }"
      options ?= {}
      options.stdio ?= [0, 0, 0]
      app = chproc.spawnSync cmd, args, options
      if app.status != 0
        Logging.err "Cmd returned #{app.status} #{cmd} #{args?.join ' '}"
        process.exit -1

    /**
    * Executing the command as it is running by itself which can get user's input
    */
    interactive-launcher : (cmd, args, options) ->
      options ?= {}
      options.stdio ?= \inherit
      options.env = process.env
      @launcher cmd, args, options

  ArrayStream = (arr) ->
    s = new stream.Readable objectMode: true
    s._read = ->
      _.each arr, (x) -> s.push x
      s.push null
    s


  {Logging, Shell, ArrayStream}
