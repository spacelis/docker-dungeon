"use_strict";
var chproc, stream, _;
chproc = require('child_process');
stream = require('stream');
_ = require('underscore');
module.exports = function(){
  var Logging, Shell, ArrayStream;
  Logging = function(){
    var chalk;
    chalk = require('chalk');
    return {
      info: function(msg){
        return console.log(chalk.blue("[INFO]") + " " + msg);
      },
      warn: function(msg){
        return console.log(chalk.yellow("[WARN]") + " " + msg);
      },
      err: function(msg){
        return console.log(chalk.bgRed("[Error]") + " " + msg);
      },
      ok: function(msg){
        return console.log(chalk.white("[OK]") + " " + msg);
      },
      exec: function(msg){
        return console.log(chalk.green("[Exec]") + " " + msg);
      },
      debug: function(obj){
        console.log(chalk.black.bgCyan("[Debug]") + " " + obj);
        return obj;
      }
    };
  }();
  Shell = function(){
    return {
      /**
      * Executing the comaand and return the output as a list of lines
      */
      exec: function(bashcmd, cwd){
        var output;
        cwd == null && (cwd = '.');
        output = chproc.execSync("bash -c '" + bashcmd + "'", {
          cwd: cwd
        }).toString().split('\n' != null
          ? '\n'
          : []);
        if (output.length === 1 && output[0].trim() === "") {
          return [];
        } else {
          return _.map(output, function(s){
            return s.trim();
          });
        }
      }
      /**
      * Executing the command and redirect the output to the current process
      */,
      launcher: function(cmd, args, options){
        var ref$, app;
        args == null && (args = []);
        Logging.exec("[" + ((ref$ = options != null ? options.cwd : void 8) != null ? ref$ : ".") + "]: " + cmd + " " + (args != null ? args.join(' ') : void 8));
        options == null && (options = {});
        options.stdio == null && (options.stdio = [0, 0, 0]);
        app = chproc.spawnSync(cmd, args, options);
        if (app.status !== 0) {
          Logging.err("Cmd returned " + app.status + " " + cmd + " " + (args != null ? args.join(' ') : void 8));
          return process.exit(-1);
        }
      }
      /**
      * Executing the command as it is running by itself which can get user's input
      */,
      interactiveLauncher: function(cmd, args, options){
        options == null && (options = {});
        options.stdio == null && (options.stdio = 'inherit');
        options.env = process.env;
        return this.launcher(cmd, args, options);
      }
    };
  }();
  ArrayStream = function(arr){
    var s;
    s = new stream.Readable({
      objectMode: true
    });
    s._read = function(){
      _.each(arr, function(x){
        return s.push(x);
      });
      return s.push(null);
    };
    return s;
  };
  return {
    Logging: Logging,
    Shell: Shell,
    ArrayStream: ArrayStream
  };
}();