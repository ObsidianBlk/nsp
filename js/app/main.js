
var Application = (function($){

  function EpisodeCard(title, description, imgurl){
    var e = $("<div></div>");
    e.addClass("card-panel hoverable");
    if (imgurl !== ""){
      e.append($("<img src=\"" + imgurl + "\" />").addClass("responsive-img"));
    }
    e.append(title);
    $("#cards").append(e);
    //$("#cards").append($("div").addClass("card-panel").text(title));
  }


  var database = require("./js/app/database");



  function LoadFeed(db){
    if (!(db instanceof database)){
      return;
    }
    
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

      while ((item = stream.read()) !== null) {
        if (item !== null){
          db.addEpisode(item);
          //console.log(item);
	  //EpisodeCard(item.title, item.description, (typeof(item.image) !== 'undefined' && typeof(item.image.url) !== 'undefined') ? item.image.url : "");
          item = null;
        }
      }
    });
  };



  return function(){
    var DB = new database();
    DB.on("episode_added", function(err, ep){
      if (!err){
        EpisodeCard(ep.title, ep.description, "");
      } else {
        console.log(err);
      }
    });
    
    DB.on("opened", (function(err){
      LoadFeed(DB);
    }).bind(this));

    DB.open("database.json");
  };
})($);
