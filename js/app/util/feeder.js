

module.exports = (function(){

  var Events = require('events');
  var FeedParser = require('feedparser');
  var Request = require('request');
  var HTTP = require('http');
  var FS = require('fs');

  function feeder(){};
  feeder.prototype.__proto__ = Events.EventEmitter.prototype;
  feeder.prototype.constructor = feeder;

  feeder.prototype.downloadFile = function(url, path, callback){
    var request = HTTP.get(url, (function(resp){
      console.log(resp);
      if (resp.statusCode === 302){ // A redirect! Let's follow it!
	this.downloadFile(resp.headers.location, path, callback);
	return;
      }
      if (resp.statusCode != 200){
	var err = new Error("File download status code (" + resp.statusCode + ") received.");
	console.log(err.message);
	if (callback){
	  callback(err);
	}
	this.emit('error', err);
	return;
      }

      var file = FS.createWriteStream(path);
      file.on('finish', (function(){
	file.close((function(){
          this.emit("file_downloaded");
	  if (callback){callback(null);}
	}).bind(this));
      }).bind(this));

      file.on('error', (function(err){
	FS.unlink(path);
	this.emit('error', err);
	if (callback){callback(err);}
      }).bind(this));

      resp.pipe(file).on('error', (function(err){
	FS.unlink(path);
	this.emit('error', err);
	if (callback){callback(err);}
      }).bind(this));
    }).bind(this));


    /*var file = FS.createWriteStream(path);
    var request = HTTP.get(url, (function(resp){
      console.log(resp);
      resp.pipe(file);
      file.on('finish', function(){
        file.close((function(){
          this.emit("file_downloaded");
	  if (callback){callback(null);}
        }).bind(this));
      });
    }).bind(this)).on('error', (function(err){
      fs.unlink(path);
      this.emit('error', err);
      if (callback){callback(err);}
    }).bind(this));*/
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
