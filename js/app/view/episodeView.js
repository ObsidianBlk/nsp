

if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.EpisodeView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');

  function AudioPath(episode){
    var path = Path.join(NSP.config.path.audio, episode.audio_filename);
    if (FS.lstatSync(path).isFile()){
      return {
	path: path,
	type: "local"
      };
    }
    return {
      path: episode.audio_src,
      type: "remote"
    };
  }


  function ListEntity(episode){
    var e = $("<li></li>");
    var header = $("<div></div>").addClass("collapsible-header blue-grey darken-2").css({"overflow": "auto"});

    var img = $("<img src=\"\">").height("64px").css({
      "width":"auto",
      "valign":"center",
      "margin":"0.1rem 0.5rem 0.5rem 0.2rem"
    }).addClass("left");

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
    entity.empty();
    
    var body = entity;//$("<div></div>").addClass("flow-text").css("background-color", "#FFFFFF");
    var img = $("<img src=\"images/nsp_logo.png\">").css("opacity","inherit");
    if (episode.img_src !== ""){
      img.attr("src", episode.img_src).css({
	"width":"20rem",
	"height":"auto"
      });;
    }
    body.append($("<div></div>").addClass("center-align").append(img))
      .append($("<h5></h5>").addClass("truncate").append(episode.title))
      .append($("<hr>"));

    for (var i=0; i < this.tagCount; i++){
      body.append($("<div></div>").addClass("tags chip").append(episode.tag(i)).append("<i class=\"material-icons\">close</i>"));
    }
    if (this.tagCount > 0){
      body.append($("<hr>"));
    }

    body.append($("<p></p>").append(episode.shortDescription));

    body.append($("<hr>"));

    for (var i=0; i < episode.storyCount; i++){
      var story = episode.story(i);
      var card = $("<div></div>").addClass("card nsp-grey");
      var titleBlock = $("<div></div>").addClass("title-block");
      titleBlock.append($("<span></span>").addClass("card-title nsp-grey-text text-lighten").append(story.title));
      if (story.beginning !== ""){
	var time = $("<time></time>").addClass("grey-text text-lighten-1").append("<i>Starting:</i> " + story.beginning);
	if (story.duration > 0){
	  time.append(" (dur: " + story.durationString + ")");
	}
	titleBlock.append("<br>").append(time);
      }
      card.append(titleBlock);
      body.append(card);
    }

    entity.append(body)
    // Yeah... this is a rather cheap trick, but, otherwise the whole area doesn't seem to scroll. This just makes sure it does.
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>")
      .append("<br>");
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

    this._activeCard = [null, null];
    this._slideActive = false;
    this._slideBuffer = 200; // px

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

    this._sheetview.find("#sheet_content").animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400);
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
      this._SlideToContent(le, episode);
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


  episodeView.prototype._SlideToContent = function(entity, episode){
    if (entity.hasClass("active")){
      if (this._activeCard[0] !== episode){
        this._activeCard[1] = episode;
      }
    } else {
      this._activeCard[0] = null;
    }
    var content = this._sheetview.find("#sheet_content");

    if (!this._slideActive){
      this._slideActive = true;
      if (content.css("margin-left") === "0px"){
        content.animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideOut.bind(this));
      } else {
        if (this._activeCard[1] !== null){
          this._activeCard[0] = this._activeCard[1];
          this._activeCard[1] = null;
          EpisodeDetails(content, this._activeCard[0]);
        }
        content.animate({"margin-left":0}, 400, this._OnSlideOut.bind(this));
      }
    }
  };



  episodeView.prototype._OnSlideOut = function(){
    if (this._activeCard[1] !== null || this._activeCard[0] === null){
      var content = this._sheetview.find("#sheet_content");
      this._slideActive = true;
      content.animate({"margin-left":this._sheetview.width()+this._slideBuffer}, 400, this._OnSlideIn.bind(this));
    } else {
      this._slideActive = false;
    }
  };


  episodeView.prototype._OnSlideIn = function(){
    if (this._activeCard[1] !== null){
      var content = this._sheetview.find("#sheet_content");
      this._activeCard[0] = this._activeCard[1];
      this._activeCard[1] = null;
      EpisodeDetails(this._sheetview.find("#sheet_content"), this._activeCard[0]);
      this._slideActive = true;
      content.animate({"margin-left":0}, 400, this._OnSlideOut.bind(this));
    } else {
      this._slideActive = false;
    }
  };



  return episodeView;
})();
