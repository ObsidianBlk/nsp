
var Path = require('path');
var FS = require('fs');

var _0777 = parseInt('0777', 8);

function mkdirr(path, mode, cb){
  if (typeof(mode) === 'function'){
    cb = mode;
    mode = _0777;
  } else if (typeof(mode) !== 'number'){
    mode = _0777;
  }

  if (typeof(cb) !== 'function'){
    cb = function(){};
  }

  //mode &= ~process.umask();
  path = Path.resolve(path);

  FS.mkdir(path, mode, function(err){
    if (!err){cb(); return;}
    if (err.code === 'ENOENT'){
      mkdirr(Path.dirname(path), mode, function(errmk){
	if (!errmk){
	  mkdirr(path, mode, cb);
	} else {cb(errmk);}
      });
    } else {
      // Just check to see if the path exists and is a directory. If it is, fine, otherwise... scream!
      FS.lstat(path, function(erstat, stat){
	if (erstat || !stat.isDirectory()){
	  cb(err);
	} else {cb();}
      });
    }
  });

}

module.exports = mkdirr;
