expect = require \chai .expect
sinon = require \sinon
stream = require \stream
gulp = require \gulp
th2 = require \through2
File = require \vinyl
_ = require \underscore

docker = require '../lib/docker'
shell = require '../lib/utils' .Shell
Logging = require '../lib/utils' .Logging

describe "Docker utility functions", ->
  
  get-a-stream = ->
    s = new stream.Readable objectMode: true
    s._read = -> 
      s.push dockerfile : new File cwd: '/', base: '/test/', path: '/test/mockfile_a', contents: new Buffer '''
        CMD aaa
        CMD aaa
        # --TAG: xxx/bbb/ccc
        # --TAG: yyy
        ''', 'utf8'
      s.push dockerfile : new File cwd: '/', base: '/test/', path: '/test/mockfile_b', contents: new Buffer '''
        CMD bbb
        CMD bbb
        # --TAG: zzz
        CMD xxx
        ''', 'utf8'
      s.push null
    s

  var sandbox

  beforeEach ->
    sandbox := sinon.sandbox.create!

  afterEach ->
    sandbox.restore!

  describe "image-tagger", (x) ->

    it 'should return correct object', (done) !->
      get-a-stream!
        .pipe docker.image-tagger!
        .on \data, (item) ->
          try
            expect item .to.have.all.keys \dockerfile, \tags
            expect item.tags .to.be.a \Array
            expect item.dockerfile .to.be.a \object
          catch e
            @emit \error, e
        .on \error, done
        .on \end, done

  describe "image-builder", (x) ->
    it 'should build image', (done) !->
      sandbox.stub shell, \launcher
      sandbox.stub Logging, \info
      get-a-stream!
        .pipe docker.image-tagger!
        .pipe docker.image-builder!
        .on \data, (img) ->
          true
        .on \end, ->
          failed = false
          try
            sinon.assert.called-twice shell.launcher
            sinon.assert.called-with shell.launcher, \docker, [\build, \-t, 'xxx/bbb/ccc', \-t, \yyy, \.], cwd: '/test'
            sinon.assert.called-with shell.launcher, \docker, [\build, \-t, \zzz, \.], cwd: '/test'
            sinon.assert.call-count Logging.info, 4
          catch e
            done e
            failed = true
          done! if not failed

  describe "rm-image", (x) ->
    it 'should remove image', !->
      sandbox.stub shell, \exec
      sandbox.stub Logging, \info
      docker.rm-image \xxxx
      sinon.assert.called-once shell.exec
      sinon.assert.called-with shell.exec, 'docker rmi xxxx'
      sinon.assert.called-once Logging.info

  describe "server-prefixed-tags", (x) ->
    it 'should leave only tags with server prefix', (done)->
      get-a-stream!
        .pipe docker.image-tagger!
        .pipe docker.server-prefixed-tags!
        .on \data, (img) ->
          try
            _.each img.tags, (t) -> expect t .to.match /^.+\/.+\/.+$/
          catch e
            @emit \error, e
        .on \error, (e) -> done e
        .on \end, ->
          done!
