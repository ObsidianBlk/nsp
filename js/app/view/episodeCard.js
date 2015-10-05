
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeCard = (function(){

  var Events = require('events');


  function episodeCard(episode){
    this._episode = episode;

    this._entity = $("<div></div>").addClass("z-depth-3").css({
      "margin": "0.5rem 0.1rem 0",
      "border-radius": "2px"
    });
    
    this._header = $("<div></div>").addClass("card-image blue-grey darken-2").css({"overflow": "auto"});
    this._img = $("<img src=\"images/nsp_logo.png\">").height("64px").css({
      "width":"auto",
      "valign":"center",
      "margin":"0.1rem 0.5rem 0.5rem 0.2rem"}).addClass("left");
    // This will search for an episode specific image and change the image source if one is found.
    require("./js/app/util/epImageFinder")(episode, (function(ep, src){
      if (src !== ""){
	this._img.attr("src", src);
	//TODO: Maybe... save this locally? IDK.
      }
    }).bind(this), function(err){console.log(err);});

    // Now back to our regularly scheduled html building via JQuery... wheeee!
    var tblock = $("<p></p>").css({
      "margin-top":"0",
      "margin-bottom":"0"
    });
    var dt = $("<span></span>").css({"font-size":"0.75rem"}).append(episode.date.toString());
    tblock.append(episode.title).append("<br>").append(dt);
    this._header.append($("<div></div>").addClass("card-title blue-grey-text text-lighten-5").css("display", "inline-block").append(tblock)).append(this._img);

    this._body = $("<div></div>").addClass("nsp-grey lighten").css({
      "padding": "20px",
      "background-color":"#FFFFFF"
    });
    var desc = $("<p></p>").append((episode.shortDescription  !== "") ? episode.shortDescription : "An episode of the NoSleep Podcast");
    this._body.append(desc);

    this._entity.append(this._header).append(this._body);
  }
  episodeCard.prototype.__proto__ = Events.EventEmitter.prototype;
  episodeCard.prototype.constructor = episodeCard;


  Object.defineProperties(episodeCard.prototype, {
    "entity":{
      get:function(){return this._entity;}
    },

    "episode":{
      get:function(){return this.episode;}
    }
  });



  return episodeCard;
})();
