
var Application = (function(){

  function EpisodeCard(title, description, imgurl){
    console.log(title);
    $("#cards").append($("div").class("card-panel").html(title));
  }



  return function(){
    var FeedParser = require('feedparser');
    var request = require('request');

    var req = request('http://nosleeppodcast.libsyn.com/rss');
    var feedparser = new FeedParser();

    req.on('error', function (error) {
      // handle any request errors
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
      // always handle errors
    });

    feedparser.on('readable', function() {
      // This is where the action is!
      var stream = this;
      var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
      var item = null;

      while ((item = stream.read())) {
	EpisodeCard(item.title, item.description, "");
	//console.log(item);
      }
    });
  };
})();
