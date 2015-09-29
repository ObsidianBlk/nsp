

module.exports = (function(){

  var Events = require('events');
  var FeedParser = require('feedparser');
  var Request = require('request');

  function feeder(){};
  feeder.prototype.__proto__ = Events.EventEmitter.prototype;
  feeder.prototype.constructor = feeder;

  feeder.prototype.rss = function(address){
    var req = Request(address);
    var feedparser = new FeedParser();
    var self = this;

    req.on('error', function (error) {
      self.emit("error", error);
    });

    req.on('response', function (res) {
      var stream = this;

      if (res.statusCode !== 200){
	return this.emit('error', new Error('Bad status code'));
      }

      stream.pipe(feedparser);
      return null;
    });

    feedparser.on('error', function(error) {
      console.log(error);
      self.emit("error", error);
    });

    feedparser.on('readable', function() {
      var stream = this;
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item = null;

      while ((item = stream.read()) !== null) {
        if (item !== null){
	  self.emit("rss_item", item);
          item = null;
        }
      }
    });

    feedparser.on('end', function(){self.emit("rss_complete");});
  };

  return feeder;
})();
