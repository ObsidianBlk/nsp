

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');

  function episodeCard(episode){
    var e = $("<div></div>").addClass("z-depth-3").css({
      "margin": "0.5rem 0.1rem 0",
      "border-radius": "2px"
    });
    
    var header = $("<div></div>").addClass("card-image blue-grey darken-2").css({"overflow": "auto"});
    var img = $("<img src=\"images/nsp_logo.png\">").height("64px").css({
      "width":"auto",
      "valign":"center",
      "margin":"0.1rem 0.5rem 0.5rem 0.2rem"}).addClass("left");
    // This will search for an episode specific image and change the image source if one is found.
    require("./js/app/util/epImageFinder")(episode, function(ep, src){
      if (src !== ""){
	img.attr("src", src);
	//TODO: Maybe... save this locally? IDK.
      }
    }, function(err){console.log(err);});

    // Now back to our regularly scheduled html building via JQuery... wheeee!
    var tblock = $("<p></p>").css({
      "margin-top":"0",
      "margin-bottom":"0"
    });
    var dt = $("<span></span>").css({"font-size":"0.75rem"}).append(episode.date.toString());
    tblock.append(episode.title).append("<br>").append(dt);
    header.append($("<div></div>").addClass("card-title blue-grey-text text-lighten-5").css("display", "inline-block").append(tblock)).append(img);

    var body = $("<div></div>").addClass("nsp-grey lighten").css({
      "padding": "20px",
      "background-color":"#FFFFFF"
    });
    var desc = $("<p></p>").append((episode.shortDescription  !== "") ? episode.shortDescription : "An episode of the NoSleep Podcast");
    body.append(desc);

    e.append(header).append(body);
    return e;
  };



  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------

  
  function episodeView(){
    this._search = "";
    this._searchType = "tags";
    this._searchExact = false;
  };
  episodeView.prototype.__proto__ = Events.EventEmitter.prototype;
  episodeView.prototype.constructor = episodeView;

  episodeView.prototype.connectToDB = function(db){
    db.on("episode_added", this.onEpisodeAdded.bind(this));
    // TODO: Add a "disconnect" option!
  };

  episodeView.prototype.addEpisode = function(episode, append){
    // We'll assume newest goes first unless explicitly stated
    append = (typeof(append) === 'boolean') ? append : false;
    if (append){
      $(".cards").append(episodeCard(episode));
    } else {
      $(".cards").prepend(episodeCard(episode));
    }
  };

  episodeView.prototype.onEpisodeAdded = function(episode){
    if (this._search !== ""){
      if (this._searchType === "tags"){
	if (this._searchExact){
	  if (episode.hasTag(this._search)){
	    this.addEpisode(episode);
	  }
	} else {
	  if (episode.hasTagLike(this._search)){
	    this.addEpisode(episode);
	  }
	}
      }
    } else {
      this.addEpisode(episode);
    }
  };

  episodeView.prototype.onChanged = function(obj){
    // Do something!
  };

  return episodeView;
})();
