


module.exports = (function(){

  var Events = require('events');
  var FeedParser = require('feedparser');
  var Request = require('request');
  var HTTP = require('http');
  var FS = require('fs');
  var Path = require('path');

  
  var ActiveCallbacks = [];
  var ActiveURIs = [];


  function MakeDirIfNotExists(path){
    var lstat = null;
    try {
      lstat = FS.lstatSync(path);
    }catch (e){ /* Nothing for now */}

    if (lstat === null){
      FS.mkdirSync(path);
      return true;
    } else if (lstat.isDirectory()){
      return true;
    }
    return false;
  }


  function AddDLCallbackToPath(path, callback){
    if (typeof(callback) === 'function'){
      for (var i=0; i < ActiveCallbacks.length; i++){
	if (ActiveCallbacks[i].path === path){
	  for (var c=0; c < ActiveCallbacks[i].callback.length; c++){
	    if (ActiveCallbacks[i].callback[c] === callback){
	      return;
	    }
	  }
	  ActiveCallbacks[i].callback.push(callback);
	  return;
	}
      }
      var index = ActiveCallbacks.length;
      ActiveCallbacks.push({
	path:path,
	callback:[]
      });
      ActiveCallbacks[index].callback.push(callback);
    }
  }

  function ProcessDownload(url, path, callback){
    for (var i=0; i < ActiveURIs.length; i++){
      if (ActiveURIs[i].url === url && ActiveURIs[i].path === path){
	AddDLCallbackToPath(path, callback);
	return false; // Don't continue processing DL. It's being processed.
      }
    }
    ActiveURIs.push({
      url:url,
      path:path
    });
    AddDLCallbackToPath(path, callback);
    return true; // This is a new URL... process it!
  }

  function DLCallbackAndClear(path, err){
    var cbindex = -1;
    for (var i=0; i < ActiveCallbacks.length; i++){
      if (ActiveCallbacks[i].path === path){
	for (var c=0; c < ActiveCallbacks[i].callback.length; c++){
	  ActiveCallbacks[i].callback[c](err);
	}
	ActiveCallbacks.splice(i, 1);
	break;
      }
    }
    
    ActiveURIs = ActiveURIs.filter(function(item){
      return (item.path !== path);
    });
  }
  

  function feeder(){};
  feeder.prototype.__proto__ = Events.EventEmitter.prototype;
  feeder.prototype.constructor = feeder;

  feeder.prototype.downloadFile = function(url, path, callback){
    if (ProcessDownload(url, path, callback) === false){return;}

    var request = HTTP.get(url, (function(resp){
      if (resp.statusCode === 302){ // A redirect! Let's follow it!
	// NOTE: We don't pass the callback in the recursive call because, if there was one, it was already added to the ActiveDownloads
	// list in the AddToActiveDownloads() call above.
	this.downloadFile(resp.headers.location, path, callback);
	return;
      }

      if (resp.statusCode != 200){
	var err = new Error("File download status code (" + resp.statusCode + ") received.");
	console.log(err.message);
	DLCallbackAndClear(path, err);
	this.emit('error', err);
	return;
      }

      // We're going to create the file ONLY if the base path exists or is created.
      if (MakeDirIfNotExists(Path.dirname(path))){
        var file = FS.createWriteStream(path);
        file.on('finish', (function(){
	  file.close((function(){
            this.emit("file_downloaded");
	    DLCallbackAndClear(path);
	  }).bind(this));
        }).bind(this));

        file.on('error', (function(err){
	  FS.unlink(path);
	  this.emit('error', err);
	  DLCallbackAndClear(path, err);
        }).bind(this));

        resp.pipe(file).on('error', (function(err){
	  FS.unlink(path);
	  this.emit('error', err);
	  DLCallbackAndClear(path, err);
        }).bind(this));
      } else {
	DLCallbackAndClear(path, new Error("Could not find or create path \"" + Path.dirname(path) + "\"."));
      }
    }).bind(this));
  };

  feeder.prototype.rss = function(address, callback){
    var req = Request(address);
    var feedparser = new FeedParser();
    var self = this;

    req.on('error', function (error) {
      self.emit("error", error);
      if (callback){
	callback(error);
      }
    });

    req.on('response', function (res) {
      var stream = this;

      if (res.statusCode !== 200){
	var err = new Error('Bad status code');
	if (callback){callback(err);}
	return this.emit('error', err);
      }

      stream.pipe(feedparser);
      return null;
    });

    feedparser.on('error', function(error) {
      console.log(error);
      self.emit("error", error);
      if (callback){callback(error);}
    });

    feedparser.on('readable', function() {
      var stream = this;
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item = null;

      while ((item = stream.read()) !== null) {
        if (item !== null){
	  self.emit("rss_item", item);
	  if (callback){callback(null, item);}
          item = null;
        }
      }
    });

    feedparser.on('end', function(){
      self.emit("rss_complete");
      if (callback){callback(null, null);}
    });
  };

  return feeder;
})();
