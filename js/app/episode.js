

module.exports = (function(){

  var Events = require("events");

  

  function VerifyEpisode(item){
    if (typeof(item) !== typeof({})){
      throw new Error("Episode is not an object.");
    }

    if (typeof(item.title) !== 'string'){
      throw new Error("Episode missing property 'title'.");
    }
    if (typeof(item.guid) !== 'string'){
      throw new Error("Episode missing property 'guid'.");
    }
    if (typeof(item.audio_src) !== 'string'){
      throw new Error("Episode missing property 'audio_src'.");
    }
    
    if (typeof(item.tag) === 'undefined'){
      item.tag = [];
    } else if (item.tag instanceof Array){
      for (var i=0; i < item.tag.length; i++){
        if (typeof(item.tag[i]) !== 'string'){
          throw new Error("Episode tags expected to be strings. Given " + typeof(item.tag[i]) + ".");
        } else {
          item.tag[i] = item.tag[i].toLowerCase();
        }
      }
    } else {
      throw new Error("Episode property 'tag' expected to be an Array. Given " + typeof(item.tag) + ".");
    }

    if (typeof(item.audio_type) !== 'string'){
      item.audio_type = "audio/mpeg";
    }
    if (typeof(item.audio_length) !== 'string'){
      item.audio_length = "0";
    }
    
    if (typeof(item.description) !== 'string'){
      item.description = "";
    }
    if (typeof(item.link) !== 'string'){
      item.link = "";
    }
    if (typeof(item.date) !== 'string'){
      item.date = "";
    }
    if (typeof(item.img_src) !== 'string'){
      item.img_src = "";
    }
    return item;
  }

  function ParseObjToEpisode(obj){
    if (typeof(obj) === typeof({})){
      if (typeof(obj.enclosures) === 'undefined'){
        return VerifyEpisode(obj);
      } else if (obj.enclosures instanceof Array){
        if (obj.enclosures.length > 0){
          if (typeof(obj.enclosures[0].url) !== 'string'){
            throw new Error("No audio information in object.");
          }

          var nobj = {
            title:obj.title,
            description:obj.description,
            author:obj.author,
            date:obj.date,
            guid:obj.guid,
            audio_src:obj.enclosures[0].url,
            audio_type:obj.enclosures[0].type,
            audio_length: obj.enclosures[0].length
          };
          if (typeof(obj.image) === typeof({}) && typeof(obj.image.url) === 'string'){
            nobj.img_src = obj.image.url;
          }

          try {
            return VerifyEpisode(nobj);
          } catch (e) {
            throw e;
          }
          
        } else {
          throw new Error("No audio information in object.");
        }
      } else {
        throw new Error("Unknown Object.");
      }
    }
    throw new Error("Episode is not an object.");
  }
  

  function episode(edata){
    try {
      this._data = ParseObjToEpisode(edata);
    } catch (e){
      throw e;
    }
  };
  episode.prototype.__proto__ = Events.EventEmitter.prototype;
  episode.prototype.constructor = episode;

  episode.prototype.fromString = function(str){
    try {
      this._data = VerifyEpisode(JSON.parse(str));
    } catch (e) {
      throw e;
    }
    this.emit("changed", null);
  };

  episode.prototype.toString = function(){
    return JSON.stringify(this._data);
  };

  episode.prototype.addTag = function(tag){
    tag = tag.toLowerCase();
    if (!this.hasTag(tag)){
      this._data.tag.push(tag);
      this.emit("changed", null);
    }
  };

  episode.prototype.removeTag = function(tag){
    tag = tag.toLowerCase();
    for (var i=0; i < this._data.tag.length; i++){
      if (tag === this._data.tag[i]){
        this._data.tag.splice(i, 1);
        this.emit("changed", null);
        break;
      }
    }
  };

  episode.prototype.hasTag = function(tag){
    for (var i=0; i < this._data.tag.length; i++){
      if (tag === this._data,tag[i]){
        return true;
      }
    }
    return false;
  };


  Object.defineProperties(episode.prototype, {
    "json":{
      get:function(){return this.toString();},
      set:function(str){
        try {
          this.fromString(str);
        } catch (e) {
          throw e;
        }
      }
    },

    "title":{
      get:function(){return this._data.title;},
      set:function(title){
        this._data.title = title;
        this.emit("changed", null);
      }
    },

    "description":{
      get:function(){return this._data.description;},
      set:function(desc){
        this._data.description = desc;
        this.emit("changed", null);
      }
    },

    "guid":{
      get:function(){return this._data.guid;}
    },

    "tags":{
      get:function(){return this._data.tag.join(",");}
    },

    "link":{
      get:function(){return this._data.link;},
      set:function(link){
        this._data.link = link;
        this.emit("changed", null);
      }
    },

    "audio_src":{
      get:function(){return this._data.audio_src;}
    },

    "img_src":{
      get:function(){return this._data.img_src;},
      set:function(src){
        this._data.img_src = src;
        this.emit("changed", null);
      }
    }
  });

  return episode;
})();
