
var Application = (function($){

  function EpisodeCard(episode){
    var e = $("<div></div>");
    e.addClass("card-panel hoverable");
    //if (imgurl !== ""){
    //  e.append($("<img src=\"" + imgurl + "\" />").addClass("responsive-img"));
    //}
    e.append($("<p></p>").append(episode.title));
    if (episode.date !== null){
      e.append($("<em></em>").append(episode.date.toString()));
    }
    $("#cards").append(e);
    //$("#cards").append($("div").addClass("card-panel").text(title));
  }


  var database = require("./js/app/database");
  var Feeder = require("./js/app/feeder.js");



  return function(){
    var DB = new database();
    var EpAdded = false;
    DB.on("episode_added", function(err, ep){
      if (!err){
        EpisodeCard(ep);
	EpAdded = true;
      } else {
        console.log(err);
      }
    });

    DB.on("error", function(err){
      console.log(err);
    });
    
    DB.on("opened", (function(err){
      var feed = new Feeder();
      var itemcount = 0;
      EpAdded = false; // Just reset it if it was triggered by the load from disc.

      feed.on("rss_item", function(item){
	itemcount += 1;
	try{
	  DB.addEpisode(item);
	} catch (e) {throw e;}
	itemcount -= 1;
      });

      feed.on("rss_complete", function(){
	while (itemcount > 0){
	  console.log("Waiting on " + itemcount + " items");
	} // Wait...
	if (EpAdded){
	  DB.save("database.json");
	} else {
	  console.log("No new episodes.");
	}
      });
      feed.rss('http://nosleeppodcast.libsyn.com/rss');
    }).bind(this));

    DB.open("database.json");
  };
})($);
