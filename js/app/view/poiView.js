
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.POIView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');

  var templates = {
    episodeListEntry: FS.readFileSync("templates/POIEpisodeEntry.html").toString()
  };


  function poiView(id){
    this._modal = $(id);
    if (this._modal.length < 1){
      throw new Error("Invalid ID");
    }

    // The one constant link's click event is defined here.
    this._modal.find(".poi-link-text a").on("click", function(){
      var link = $(this).attr("data-link");
      if (link.length > 0){
	require('nw.gui').Shell.openExternal(link);
      }
    });

    this._type = null;
    this._name = null;
  }
  poiView.prototype.__proto__ = Events.EventEmitter.prototype;
  poiView.prototype.constructor = poiView;

  poiView.prototype.writer = function(writer, link){
    this._OpenModal("writer", writer, (function(){
      this._FillInModal("writer", writer, link);
    }).bind(this));
  };

  poiView.prototype.narrator = function(narrator, link){
    this._OpenModal("narrator", narrator, (function(){
      this._FillInModal("narrator", narrator, link);
    }).bind(this));
  };

  poiView.prototype.close = function(){
    if (this.open){
      this._modal.closeModal({complete:(function(){
	this._name = null;
	this._type = null;
      }).bind(this)});
    }
  };

  poiView.prototype._FillInModal = function(type, name, link){
    var info = this._FindPersonData(type, name);
    if (type === "writer"){
      this._modal.find("i.option-writer").css("display", "inline-block");
      this._modal.find("i.option-narrator").css("display", "none");
    } else if (type === "narrator"){
      this._modal.find("i.option-narrator").css("display", "inline-block");
      this._modal.find("i.option-writer").css("display", "none");
    }
    this._modal.find(".poi-name").empty().append(name);
    if (typeof(link) === 'string' && link.length > 0){
      this._modal.find(".poi-link-text").removeAttr("style");
      this._modal.find(".poi-link-text a").attr("data-link", link);
    } else {
      this._modal.find(".poi-link-text").css("display", "none");
    }
    var list = this._modal.find(".poi-episode-list");
    if (list.length > 0){
      list.empty();
      for (var i=0; i < info.length; i++){
	var entry = $(templates.episodeListEntry);
	var title = (info[i].episode.seasonEpisodeTitle !== "") ? info[i].episode.seasonEpisodeTitle : info[i].episode.title;
	entry.find(".poi-episode-entry-title").append(title);
	var storyList = entry.find(".poi-episode-story-list");
	for (var s=0; s < info[i].story.length; s++){
	  var entity = $("<a href=\"#!\" class=\"collection-item nsp-grey nsp-text text-highlight\"></a>");
	  entity.attr("data-poiguid", info[i].episode.guid);
	  entity.attr("data-poititle", info[i].story[s].title);
	  entity.on("click", (function(evt){
	    this.emit("view_episode", {
	      guid: $(evt.target).attr("data-poiguid"),
	      title: $(evt.target).attr("data-poititle")
	    });
	    this.close();
	  }).bind(this));
	  entity.append(info[i].story[s].title);
	  storyList.append(entity);
	}
	list.append(entry);
      }
      $('.collapsible').collapsible();
    }
  };

  poiView.prototype._FindPersonData = function(type, name){
    var result = [];
    var stories = null;
    for (var i=0; i < NSP.db.episodeCount; i++){
      var ep = NSP.db.episode(i);
      if (type === "writer"){
	stories = ep.storiesByWriter(name);
      } else if (type === "narrator"){
	stories = ep.storiesByNarrator(name);
      }
      if (stories.length > 0){
	result.push({episode:ep, story:stories});
      }
    }
    if (result.length > 0){
      result.sort(function(a, b){
	if (a.episode.date > b.episode.date){
	  return -1;
	} else if (a.episode.date < b.episode.date){
	  return 1;
	}
	return 0;
      });
    }
    return result;
  };

  poiView.prototype._OpenModal = function(type, name, func){
    if (this._name !== name || this._type !== type){
      if (this.open){
	this._modal.closeModal({complete:(function(){
	  this._type = null;
	  this._name = null;
	  this._OpenModal(type, name, func);
	}).bind(this)});
      } else {
	this._type = type;
	this._name = name;
	func();
	this._modal.openModal({
	  ready:(function(){
	    this._modal.find(".modal-content").scrollTop(0);
	  }).bind(this),

	  complete:(function(){
	    this._type = null;
	    this._name = null;
	  }).bind(this)
	});
      }
    }
  };

  Object.defineProperties(poiView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return poiView;
})();
