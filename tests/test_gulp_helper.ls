expect = require \chai .expect
sinon = require \sinon

utils = require '../lib/utils'


describe 'common-tasks', ->

  var sandbox
  
  beforeEach ->
    sandbox := sinon.sandbox.create!

  afterEach ->
    sandbox.restore!

  describe 'build image', (x) ->
    it 'should issue the build command', ->


