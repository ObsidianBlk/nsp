
if (typeof(window.View) === 'undefined'){
  window.View = {};
}

window.View.PlaylistView = (function(){

  var Events = require('events');
  var FS = require('fs');
  var Path = require('path');
  var Playlist = require('./js/app/model/playlist');

  var templates = {
    playlistItem: FS.readFileSync("templates/playlistItem.html").toString()
  };



  function PlaylistItem(pl){
    var e = $(templates.playlistItem);
    e.find(".playlist-title").text(pl.name);
    e.on("click", (function(){
      this.emit("playlist_selected", pl);
      this.close();
    }).bind(this));
    return e;
  }


  function playlistView(id){
    this._modal = $(id);
    this._playlist = [];
    this._curPlaylist = null;
    this._ConfigureControlButtons();
  }
  playlistView.prototype.__proto__ = Events.EventEmitter.prototype;
  playlistView.prototype.constructor = playlistView;

  playlistView.prototype.openModal = function(curPlaylist){
    if (this.open === false){
      this._curPlaylist = (typeof(curPlaylist) !== 'undefined' && curPlaylist !== null) ? curPlaylist : null;
      this._modal.find(".playlist-selection").empty();
      this._modal.find(".playlist-current-editor").css("display", "none");
      this._modal.find(".playlist-load-indicator").removeAttr("style");
      
      this._ScanForPlaylists(NSP.config.path.playlists, (function(err){
	if (err){
	  Materialize.toast(err.message);
	} else {
	  if (this._curPlaylist !== null){
	    this._modal.find(".playlist-current-editor").removeAttr("style");
	    this._modal.find("#playlist-current-name").val(this._curPlaylist.name);
	  }
	  this._modal.find(".playlist-load-indicator").css("display", "none");

	  var pllist = this._modal.find(".playlist-selection");
	  for (var i=0; i < this._playlist.length; i++){
	    // Way to hack a closure bro...
	    pllist.append((PlaylistItem.bind(this))(this._playlist[i]));
	  }
	}
      }).bind(this));

      this._modal.openModal();
    }
  };

  playlistView.prototype.close = function(){
    if (this.open){
      this._modal.closeModal();
    }
  };

  playlistView.prototype._HasPlaylistAtPath = function(filename){
    for (var i=0; i < this._playlist.length; i++){
      var path = Path.normalize(Path.join(NSP.config.path.playlists, filename));
      var plpath = Path.normalize(Path.join(NSP.config.path.playlists, this._playlist[i].filename));
      if (plpath === path){
	return true;
      }
    }
    return false;
  };

  playlistView.prototype._ScanForPlaylists = function(path, callback){
    FS.readdir(path, (function(err, files){
      var loading = 0;
      if (err){
	if (callback){callback(err);}
	console.log(err);
      } else {
	for (var i=0; i < files.length; i++){
	  try {
	    var fpath = Path.normalize(Path.join(path, files[i]));
	    var stat = FS.lstatSync(fpath);
	    if (stat.isFile()){
	      if (Path.extname(files[i]).toLowerCase() === ".plj" && this._HasPlaylistAtPath(files[i]) === false){
		try {
		  var pl = new Playlist();
		  pl.on("opened", (function(){
		    pl.removeAllListeners(); // Clears the "opened" and "error" event listeners from this playlist.
		    this._playlist.push(pl);
		    loading -= 1;
		  }).bind(this));
		  pl.on("error", function(e){
		    loading -= 1;
		    console.log(e);
		  });
		  loading += 1;
		  pl.open(fpath);
		} catch (e) {
		  console.log(e.message);
		}
	      }
	    }
	  } catch (e) {
	    console.log(e);
	  }
	}
	if (callback){
	  var lock = setInterval(function(){
	    if (loading <= 0){
	      clearInterval(lock);
	      callback();
	    }
	  });
	}
      }
    }).bind(this));
  };

  playlistView.prototype._ConfigureControlButtons = function(){
    var act_save_playlist = this._modal.find(".playlist-save-action");
    act_save_playlist.on("click", (function(){
      if (this._modal.find(".playlist-current-editor").css("display") !== "none" && this._curPlaylist !== null){
	var value = this._modal.find("#playlist-current-name").val();
	if (typeof(value) === 'string' && value.length > 0 && this._curPlaylist.name !== value){
	  this._curPlaylist.name = value;
	  act_save_playlist.addClass("disable");

	  var path = Path.normalize(Path.join(NSP.config.path.playlists, this._curPlaylist.filename));
	  var callback = (function(err){
	    act_save_playlist.removeClass("disable");
	    this._curPlaylist.removeListener("saved", callback);
	    if (err){
	      var errmsg = (typeof(err.message) === 'string') ? err.message : err;
	      Materialize.toast("Playlist Save ERROR: " + errmsg, 3000);
	    } else {
	      Materialize.toast("\"" + this._curPlaylist.name + "\" Saved", 3000);
	    }
	  }).bind(this);
	  this._curPlaylist.on("saved", callback);
	  this._curPlaylist.save(path);
	}
      }
    }).bind(this));

    var act_close = this._modal.find(".playlist-close-action");
    act_close.on("click", (function(){
      this.close();
    }).bind(this));
  };


  Object.defineProperties(playlistView.prototype, {
    "open":{
      get:function(){
	return this._modal.css("display") !== "none";
      }
    }
  });

  return playlistView;
})();
