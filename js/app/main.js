
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
    var desc = $("<p></p>").append("Hi there");
    body.append(desc);

    e.append(header).append(body);

    $(".cards").append(e);
  }


  var Database = require("./js/app/database");
  var Config = require("./js/app/config");
  var Feeder = require("./js/app/feeder.js");



  return function(){
    var conf = new Config();
    var db = new Database();
    var EpAdded = false;

    db.on("episode_added", function(ep){
      EpisodeCard2(ep);
      EpAdded = true;
    });

    db.on("error", function(err){
      console.log(err);
    });
    
    db.on("opened", (function(database_exists){
      if (conf.downloadFeedAtStartup){
	EpAdded = false; // Just reset it if it was triggered by the load from disc.
	var feed = new Feeder();
	var itemcount = 0;

	feed.on("rss_item", function(item){
	  itemcount += 1;
	  try{
	    db.addEpisode(item);
	  } catch (e) {throw e;}
	  itemcount -= 1;
	});

	feed.on("rss_complete", function(){
	  while (itemcount > 0){
	    console.log("Waiting on " + itemcount + " items");
	  } // Wait...
	  if (EpAdded || database_exists === false){
	    db.save(conf.path.database);
	  } else {
	    console.log("No new episodes.");
	  }
	});

	feed.rss('http://nosleeppodcast.libsyn.com/rss');
      } else if (database_exists === false){
	db.save(conf.path.database);
      }
    }).bind(this));

    conf.on("error", function(err){
      console.log(err);

      // Load DB anyway. Config should have default values.
      // TODO: Change this to a question for the user.
      db.open(conf.path.database, conf.skipInvalidEpisodes);
    });

    conf.on("opened", function(config_exists){
      if (config_exists === false){
	conf.save("config.json");
      }
      // Config loaded, now load the database file.
      db.open(conf.path.database, conf.skipInvalidEpisodes);
    });

    conf.open("config.json");
  };
})($);
