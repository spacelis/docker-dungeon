expect = require \chai .expect
sinon = require \sinon
th2 = require \through2
chproc = require \child_process

utils = require '../lib/utils'

describe 'utils.Logging', ->
  var sandbox

  beforeEach ->
    sandbox := sinon.sandbox.create!
    sandbox.stub console, \log

  afterEach ->
    sandbox.restore!

  for mth in [\info, \warn, \err, \ok, \exec, \debug]
    describe "Logging.#{mth}", (x) ->  # the x is for avoiding name clash introduced by livescript
      it "should call console.log exactly once.", ->
        utils.Logging[mth] 'information'
        sinon.assert.calledOnce(console.log)
        sinon.assert.called-with-match console.log, /\[.*information/


describe 'utils.Shell', !->

  var sandbox

  describe "exec", (x) !->
    beforeEach !->
      sandbox := sinon.sandbox.create!
      sandbox.stub utils.Logging, \exec
      sandbox.stub utils.Logging, \err

    afterEach !->
      sandbox.restore!

    it "should call execSync with the right parameters.", !->
      sandbox.stub chproc, \execSync .returns 'aaa\nbbb'
      ret = utils.Shell.exec \ls
      expect ret .to.deep.equal ['aaa', 'bbb']
      sinon.assert.calledOnce(chproc.execSync)
      sinon.assert.calledWith(chproc.execSync, "bash -c 'ls'", cwd: ".")


    it "should call spawnSync with the right parameters.", !->
      sandbox.stub chproc, \spawnSync .returns status: 0
      sandbox.stub process, \exit
      utils.Shell.launcher \ls
      sinon.assert.notCalled process.exit
      sinon.assert.calledOnce chproc.spawnSync
      sinon.assert.calledWith chproc.spawnSync, 'ls', [], stdio: [0, 0, 0]


    it "should call spawnSync with the right parameters.", !->
      sandbox.stub chproc, \spawnSync .returns status: 1
      sandbox.stub process, \exit
      utils.Shell.launcher \ls
      sinon.assert.calledOnce process.exit
      sinon.assert.calledWith process.exit, -1
      sinon.assert.calledOnce chproc.spawnSync
      sinon.assert.calledWith chproc.spawnSync, 'ls', [], stdio: [0, 0, 0]

    it "should pass on parameters.", !->
      sandbox.stub chproc, \spawnSync .returns status: 1
      sandbox.stub process, \exit
      utils.Shell.launcher \ls, [\-l, \root], cwd: '/'
      sinon.assert.calledOnce process.exit
      sinon.assert.calledWith process.exit, -1
      sinon.assert.calledOnce chproc.spawnSync
      sinon.assert.calledWith chproc.spawnSync, 'ls', [\-l, \root], stdio: [0, 0, 0], cwd: '/'

describe 'utils.ArrayStream', (x) !->
  var sandbox

  beforeEach !->
    sandbox := sinon.sandbox.create!

  afterEach !->
    sandbox.restore!

  it "should emit data in array", (done)->
    failed = false
    utils.ArrayStream [1,2,3]
      .on \data, (v)->
        expect v .to.be.at.least 1
        expect v .to.be.at.most 3
      .on \end, ->
        done!
      .on \error, (e) ->
        done e

  it "should quit gracefully when there is no data", (done)->
    failed = false
    dummy = sandbox.spy!
    utils.ArrayStream []
      .on \data, (v)->
        dummy!
      .on \end, ->
        try
          sinon.assert.not-called dummy
          done!
        catch e
          done e
      .on \error, (e) ->
        done e
