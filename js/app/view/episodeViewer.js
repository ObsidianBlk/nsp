

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');

  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------

  
  function episodeView(){
    this._episodeCard = [];
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
    var ecard = new View.EpisodeCard(episode);
    this._episodeCard.push(ecard);
    if (append){
      $(".cards").append(ecard.entity);
    } else {
      $(".cards").prepend(ecard.entity);
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
