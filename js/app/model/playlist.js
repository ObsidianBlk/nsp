

module.exports = (function(){

  var FS = require("fs");
  var Path = require("path");
  var Events = require("events");

  var JSON_INDENTATION_STRING = "  ";

  function NameToFilename(name){
    // NOTE: The code in this function is used and modified from...
    // https://github.com/parshap/node-sanitize-filename
    // ~I~  did not develop this

    var illegalRe = /[\/\?<>\\:\*\|":]/g;
    var controlRe = /[\x00-\x1f\x80-\x9f]/g;
    var reservedRe = /^\.+$/;
    var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

    var sanitized = name
      .replace(illegalRe, "")
      .replace(controlRe, "")
      .replace(reservedRe, "")
      .replace(windowsReservedRe, "");

    var buffer = new Buffer(255);
    var written = buffer.write(sanitized, "utf8");
    return buffer.toString("utf8", 0, written);
  }


  function playlist(){
    this._filename = "";
    this._name = "";
    this._item = [];
    this._dirty = false;

    this._loading = false;
    this._saving = false;
  }

  playlist.prototype.__proto__ = Events.EventEmitter.prototype;
  playlist.prototype.contructor = playlist;

  playlist.prototype.fromString = function(str){
    var data = null;
    try{
      data = JSON.parse(str);
    } catch (e) {
      throw e;
    }

    var idreg = /(NSP_PLAYLIST_)(\d)_(\d)/;
    if (typeof(data.ID) !== 'string'){
      throw new Error("Missing Property 'ID' or property is not string.");
    }
    var IDMatch = data.ID.match(idreg);
    if (IDMatch === null){
      throw new Error("Property 'ID' malformed.");
    }
    var version = {
      major: (Number.isNaN(parseInt(IDMatch[2])) === false) ? parseInt(IDMatch[2]) : 0,
      minor: (Number.isNaN(parseInt(IDMatch[3])) === false) ? parseInt(IDMatch[3]) : 0
    };
    if (version.major !== 1){
      throw new Error("Unknown playlist version " + version.major + "." + version.minor);
    }
    if (version.minor > 0){
      console.log("WARNING: Playlist minor version greater than expected. Some features may not load.");
    }

    if (typeof(data.name) !== 'string'){
      throw new Error("Missing property 'name' or property is not a string.");
    }
    this._name = data.name;

    if (typeof(data.items) !== 'undefined' && typeof(data.items.length) !== 'undefined'){
      for (var i=0; i < data.items.length; i++){
	var guid = (typeof(data.items[i].guid) === 'string') ? data.items[i].guid : null;
	var title = (typeof(data.items[i].title) === 'string') ? data.items[i].title : null;
	if (guid !== null){
	  this.add(guid, title);
	}
      }
    }
  };

  playlist.prototype.toString = function(){
    return JSON.stringify({
      ID: "NSP_PLAYLIST_1_0",
      name: this._name,
      items: this._item
    }, null, JSON_INDENTATION_STRING);
  };

  playlist.prototype.clone = function(){
    var pl = new playlist();
    try {
      pl.fromString(this.toString());
    } catch (e) {throw e;}
    return pl;
  };

  playlist.prototype.clear = function(){
    if (this.saving || this.loading){return;}
    this._item = [];
    this._name = "";
    this._filename = "";
    this._dirty = false;
  };

  playlist.prototype.add = function(guid, title){
    if (this.saving === false){
      title = (typeof(title) === 'string' && title !== "") ? title : null;
      if (this._ItemIndex(guid, title) < 0){
	this._item.push({
	  guid: guid,
	  title: title
	});
	if (this.loading === false){
	  this.emit("item_added");
	}
      }
    }
  };

  playlist.prototype.remove = function(guid, title){
    if (this.loading || this.saving){return;}

    title = (typeof(title) === 'string' && title !== "") ? title : null;
    var index = this._ItemIndex(guid, title);
    if (index >= 0){
      var item = this._item[index];
      this._item.splice(index, 1);
      this.emit("item_removed", item.guid, item.title);
    }
  };

  playlist.prototype.shiftUp = function(index){
    if (this.loading || this.saving){return;}

    // Ignore index 0, as it's shifted as high as it will go.
    if (index >= 1 && index < this._item.length){
      var item = this._item[index];
      this._item.splice(index, 1);
      this._item.splice(index-1, 0, item);
      this.emit("item_shift", index, index-1);
    }
  };

  playlist.prototype.shiftDown = function(index){
    if (this.loading || this.saving){return;}

    // Ignore index if it's the last index in the array as it's as low as it can go.
    if (index >= 0 && index < this._item.length-1){
      var item = this._item[index];
      this._item.splice(index, 1);
      this._item.splice(index+1, 0, item);
      this.emit("item_shift", index, index+1);
    }
  };

  playlist.prototype.has = function(guid, title){
    title = (typeof(title) === 'string' && title !== "") ? title : null;
    return (this._ItemIndex(guid, title) >= 0);
  };

  playlist.prototype.item = function(index){
    if (index >= 0 && index < this._item.length){
      return {
	guid: this._item[index].guid,
	title: this._item[index].title
      };
    }
    throw new RangeError();
  };

  playlist.prototype.open = function(path){
    if (this.loading || this.saving){return;}
    
    path = Path.normalize(path);
    this._loading = true;
    FS.access(path, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
        // Only bother loading if there was no issue. This should mean the file exists.
        FS.readFile(path, (function(err, data){
          if (err){
            this._loading = false;
            this.emit("error", err);
          } else {
            try {
              this.fromString(data.toString());
	      this._filename = path;
              this._loading = false;
              this.emit("opened", true);
              this.emit("changed");
            } catch (e) {
              this.emit("error", e);
            }
          }
        }).bind(this));
      } else {
        this._loading = false;
        this.emit("opened", false);
      }
    }).bind(this));
  };


  playlist.prototype.save = function(path){
    if (this.loading || this.saving){return;}
    
    path = Path.normalize(path);
    var base = Path.dirname(path);
    this._saving = true;
    FS.access(base, FS.R_OK | FS.W_OK, (function(err){
      if (!err){
	FS.writeFile(path, this.toString(), (function(err){
          this._saving = false;
	  if (err){
	    this.emit("error", err);
	  } else {
            this._dirty = false;
	    this.emit("saved");
	  }
	}).bind(this));
      } else {
        this._saving = false;
	this.emit("error", err);
      }
    }).bind(this));
  };

  playlist.prototype._ItemIndex = function(guid, title){
    for (var i=0; i < this._item.length; i++){
      if (this._item[i] === guid && this._item[i] === title){
	return i;
      }
    }
    return -1;
  };

  Object.defineProperties(playlist.prototype, {
    "name":{
      get:function(){return this._name;},
      set:function(name){
	if (typeof(name) !== 'string'){
	  throw new TypeError();
	}
	this._name = name;
	this.emit("changed");
	this._dirty = true;
      }
    },

    "filename":{
      get:function(){
	if (this._filename === ""){
	  var fn = NameToFilename(this._name);
	  if (fn.length > 250){
	    fn = fn.substr(0, 250);
	  }
	  return fn + ".plj";
	}
	return this._filename;
      },
      set:function(filename){
	if (typeof(filename) !== 'string'){throw new TypeError();}
	if (filename.length > 0){
	  this._filename = filename;
	  this.emit("changed");
	}
      }
    },

    "length":{
      get:function(){return this._item.length;}
    },

    "dirty":{
      get:function(){return this._dirty;}
    },

    "loading":{
      get:function(){return this._loading;}
    },

    "saving":{
      get:function(){return this._saving;}
    }
  });

  return playlist;
})();