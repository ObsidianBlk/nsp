

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');


  function ListEntity(episode){
    var e = $("<li></li>");
    var header = $("<div></div>").addClass("collapsible-header blue-grey darken-2").css({"overflow": "auto"});

    var img = $("<img src=\"\">").height("64px").css({
	"width":"auto",
	"valign":"center",
	"margin":"0.1rem 0.5rem 0.5rem 0.2rem"}).addClass("left");

    if (episode.img_src !== ""){
      img.attr("src", episode.img_src);
    } else {
      img.attr("src", "images/nsp_logo.png");
      // This will search for an episode specific image and change the image source if one is found.
      require("./js/app/util/epImageFinder")(episode, function(ep, src){
	if (src !== ""){
	  img.attr("src", src);
	  if (ep.img_src !== src){
	    ep.img_src = src;
	  }
	}
      }, function(err){console.log(err);});
    }

    header.append(img).append($("<p></p>").addClass("truncate").text(episode.title));

    var body = $("<div></div>").addClass("collapsible-body").css({"background-color":"#FFFFFF"});
    body.append($("<p></p>").text(episode.shortDescription));

    return e.append(header).append(body);
  }


  function EpisodeDetails(entity, episode){
    var img = $("<img src=\"images/nsp_logo.png\">").addClass("center-align");
    if (episode.img_src !== ""){
      img.attr("src", episode.img_src).css({
	"width":"20rem",
	"height":"auto"
      });;
    }
    entity.append($("<p></p>").append(episode.title));

    for (var i=0; i < this.tagCount; i++){
      entity.append($("<div></div>").addClass("tags chip").append(episode.tag(i)).append("<i class=\"material-icons\">close</i>"));
    }
  }

  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  
  function episodeView(listview_class, sheetview_class){
    this._listview = $(listview_class);
    if (this._listview.length !== 1){
      throw new Error("Could not find list view entity.");
    }
    this._sheetview = $(sheetview_class);
    if (this._sheetview.length !== 1){
      throw new Error("Could not find sheet view entity.");
    }

    //class="collapsible" data-collapsible="accordion"
    this._list = $("<ul></ul>").addClass("collapsible popout").attr("data-collapsible","accordion");
    this._listview.append(this._list);

    this._listDirty = false;

    this._activeCard = null;
    this._sheetTransitionSpeed = 0.5; // In Seconds.
    this._transitionState = 0;

    this._episodeCard = [];
    this._search = "";
    this._searchType = "tags";
    this._searchExact = false;

    this._updateInterval = setInterval((function(){
      if (this._listDirty){
	$('.collapsible').collapsible();
	this._listDirty = false;
      }
    }).bind(this), 200);
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
    this._episodeCard.push(episode);
    
    var le = ListEntity(episode);
    le.on("click", (function(){
      if (le.hasClass("active")){
	console.log("Item active!");
	if (this._activeCard !== episode){
	  this._activeCard = episode;
	  if (this._transitionState !== 0 && this._activeCard !== null){
	    this._transitionState += 1;
	  } else {
	    console.log("Transitioning");
	    EpisodeDetails(this._sheetview, this._activeCard);
	    this._sheetview.fadeIn(400, this._OnFadedIn.bind(this));
	  }
	}
      } else {
	this._activeCard = null;
	if (this._transitionState === 0){
	  this._transitionState = 1;
	  this._sheetview.fadeOut(400, this._OnFadedOut.bind(this));
	}
      }
    }).bind(this));

    if (append){
      this._list.append(le);
    } else {
      this._list.prepend(le);
    }
    this._listDirty = true;
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

  episodeView.prototype._OnFadedIn = function(){
    if (this._transitionState > 1){
      this._transitionState -= 1;
      this._sheetview.fadedOut(400, this._OnFadeOut.bind(this));
    } else {
      this._transitionState = 0;
    }
  };

  episodeView.prototype._OnFadedOut = function(){
    this._sheetview.empty();
    if (this._transitionState > 1 && this._activeCard !== null){
      EpisodeDetails(this._sheetview, this._activeCard);
      this._sheetview.fadeIn(400, this._OnFadedIn.bind(this));
    } else {
      this._transitionState = 0;
    }
  };


  return episodeView;
})();
