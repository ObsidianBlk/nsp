
var Application = (function($){

  function EpisodeCard(episode){
    var e = $("<div></div>");
    e.addClass("card-panel hoverable");
    //if (imgurl !== ""){
    //  e.append($("<img src=\"" + imgurl + "\" />").addClass("responsive-img"));
    //}
    e.append($("<p></p>").append(episode.title));
    if (episode.date !== null){
      e.append($("<p></p>").append(episode.date.toString()));
    }
    $("#cards").append(e);
    //$("#cards").append($("div").addClass("card-panel").text(title));
  }

  function EpisodeCard2(episode){
    var e = $("<div></div>").addClass("z-depth-3").css({
      "margin": "0.5rem 0.1rem 0",
      "border-radius": "2px"
    });
    
    var header = $("<div></div>").addClass("card-image blue-grey darken-2").css({"overflow": "auto"});
    var img = $("<img src=\"images/nsp_logo.png\">").height("64px").css("width", "auto").css("valign", "center").addClass("right");
    var tblock = $("<p></p>").css({
      "margin-top":"0",
      "margin-bottom":"0"
    });
    var title = $("<span></span>").css("font-size", "2em").append(episode.title);
    tblock.append(title).append("<br>").append(episode.date.toString());
    header.append($("<div></div>").addClass("card-title blue-grey-text text-lighten-5").css("display", "inline-block").append(tblock)).append(img);

    var body = $("<div></div>").addClass("blue-grey lighten-1").css({
      "padding": "20px",
      "background-color":"#FFFFFF"
    });
    var desc = $("<p></p>").append(episode.description);
    body.append(desc);

    e.append(header).append(body);

    $("#cards").append(e);
  }


  var database = require("./js/app/database");
  var Feeder = require("./js/app/feeder.js");



  return function(){
    var DB = new database();
    var EpAdded = false;
    DB.on("episode_added", function(err, ep){
      if (!err){
        EpisodeCard2(ep);
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
